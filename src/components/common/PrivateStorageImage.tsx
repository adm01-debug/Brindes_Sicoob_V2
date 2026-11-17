import { useEffect, useState, type ComponentProps } from 'react';
import {
  parsePrivateStorageReference,
  resolvePrivateStorageUrl,
  type PrivateStorageBucket,
} from '@/lib/private-storage';

interface PrivateStorageImageProps extends Omit<ComponentProps<'img'>, 'src'> {
  value: string;
  bucket: PrivateStorageBucket;
}

export function PrivateStorageImage({ value, bucket, ...props }: PrivateStorageImageProps) {
  const [src, setSrc] = useState(() => parsePrivateStorageReference(value) ? null : value);

  useEffect(() => {
    let active = true;
    setSrc(parsePrivateStorageReference(value) ? null : value);
    void resolvePrivateStorageUrl(value, bucket).then((resolved) => {
      if (active) setSrc(resolved);
    });
    return () => { active = false; };
  }, [bucket, value]);

  return <img {...props} src={src ?? undefined} />;
}
