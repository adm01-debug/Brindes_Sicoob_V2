import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authorize } from '../_shared/authorize.ts';

// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // AuthZ: github-fix-config escreve no repositório via PAT — apenas dev.
  // Server-side double-check via has_role() (defesa em profundidade).
  const auth = await authorize(req, { requireRole: 'dev', enforceServerSide: true });
  if (!auth.ok) return auth.response;

  try {
    const GITHUB_TOKEN = Deno.env.get('GITHUB_PAT');
    const REPO = "adm01-debug/gifts-store";
    
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_PAT not configured');
    }

    const headers = {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    const results: Record<string, unknown>[] = [];

    // Helper function to encode to base64 (handles UTF-8)
    const encodeBase64 = (str: string): string => {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      let binary = '';
      for (let i = 0; i < data.length; i++) {
        binary += String.fromCharCode(data[i]);
      }
      return btoa(binary);
    };

    // Helper to decode base64 (handles UTF-8)
    const decodeBase64 = (base64: string): string => {
      const cleanBase64 = (base64 || '').replace(/[\n\r\s]/g, '');
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    };

    // 1. Fix tsconfig.node.json
    const tsconfigNodeContent = {
      "compilerOptions": {
        "composite": true,
        "target": "ES2022",
        "lib": ["ES2023"],
        "module": "ESNext",
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "isolatedModules": true,
        "moduleDetection": "force",
        "strict": true,
        "noUnusedLocals": false,
        "noUnusedParameters": false,
        "noFallthroughCasesInSwitch": true
      },
      "include": ["vite.config.ts"]
    };

    // Get current SHA for tsconfig.node.json
    console.log('Fetching tsconfig.node.json...');
    const tsconfigNodeRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/tsconfig.node.json`,
      { headers }
    );
    const tsconfigNodeData = await tsconfigNodeRes.json();
    
    if (!tsconfigNodeData.sha) {
      throw new Error(`Failed to get tsconfig.node.json: ${JSON.stringify(tsconfigNodeData)}`);
    }
    
    // Update tsconfig.node.json
    console.log('Updating tsconfig.node.json...');
    const tsconfigNodeUpdate = await fetch(
      `https://api.github.com/repos/${REPO}/contents/tsconfig.node.json`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: "fix: add composite:true and remove noEmit from tsconfig.node.json",
          content: encodeBase64(JSON.stringify(tsconfigNodeContent, null, 2)),
          sha: tsconfigNodeData.sha
        })
      }
    );
    const tsconfigResult = await tsconfigNodeUpdate.json();
    results.push({
      file: 'tsconfig.node.json',
      status: tsconfigNodeUpdate.status,
      success: tsconfigNodeUpdate.ok,
      message: tsconfigNodeUpdate.ok ? 'Updated successfully' : tsconfigResult.message
    });

    // 2. Fix package.json - add build:dev script
    console.log('Fetching package.json...');
    const packageRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/package.json`,
      { headers }
    );
    const packageData = await packageRes.json();
    
    if (!packageData.sha || !packageData.content) {
      throw new Error(`Failed to get package.json: ${JSON.stringify(packageData)}`);
    }
    
    // Decode current package.json
    const currentPackageContent = JSON.parse(decodeBase64(packageData.content));
    
    // Add build:dev script if not exists
    if (!currentPackageContent.scripts['build:dev']) {
      console.log('Adding build:dev script...');
      currentPackageContent.scripts['build:dev'] = 'vite build --mode development';
      
      const packageUpdate = await fetch(
        `https://api.github.com/repos/${REPO}/contents/package.json`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: "fix: add build:dev script to package.json",
            content: encodeBase64(JSON.stringify(currentPackageContent, null, 2)),
            sha: packageData.sha
          })
        }
      );
      const packageResult = await packageUpdate.json();
      results.push({
        file: 'package.json',
        status: packageUpdate.status,
        success: packageUpdate.ok,
        message: packageUpdate.ok ? 'Updated successfully' : packageResult.message
      });
    } else {
      results.push({
        file: 'package.json',
        status: 200,
        success: true,
        message: 'build:dev already exists'
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
