import { useEffect, useState, type ComponentProps } from 'react';
import {
  parsePrivateStorageReference,
  resolvePrivateStorageUrlSafe,
  type PrivateStorageBucket,
} from '@/lib/private-storage';

interface PrivateStorageImageProps extends Omit<ComponentProps<'img'>, 'src'> {
  value: string;
  bucket: PrivateStorageBucket;
}

export function PrivateStorageImage({ value, bucket, className, alt, ...props }: PrivateStorageImageProps) {
  const [src, setSrc] = useState(() => (parsePrivateStorageReference(value) ? null : value));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc(parsePrivateStorageReference(value) ? null : value);
    setFailed(false);
    void resolvePrivateStorageUrlSafe(value, bucket).then((resolved) => {
      if (!active) return;
      setSrc(resolved);
      // Sem URL assinada nenhuma requisicao e feita, entao o onError nativo da
      // <img> nunca dispara: a falha precisa ser sinalizada aqui.
      setFailed(resolved === null);
    });
    return () => {
      active = false;
    };
  }, [bucket, value]);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={alt ? `${alt} (imagem indisponivel)` : 'Imagem indisponivel'}
        title="Imagem indisponivel"
        className={className}
        data-private-storage-error="true"
      />
    );
  }

  return <img {...props} alt={alt} className={className} src={src ?? undefined} onError={() => setFailed(true)} />;
}