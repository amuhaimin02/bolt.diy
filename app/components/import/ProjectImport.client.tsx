import { useSearchParams } from '@remix-run/react';

export function ProjectImport() {
  const [searchParams] = useSearchParams();

  const projectHex = searchParams.get('project-hex');

  return (
    <div className="flex items-center justify-center m-24">
      <div className="text-white text-2xl">
        <p>Importing {projectHex}</p>
      </div>
    </div>
  );
}
