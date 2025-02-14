import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { ProjectImport } from '~/components/import/ProjectImport.client';

export const meta: MetaFunction = () => {
  return [{ title: 'Debug Agent' }, { name: 'description', content: 'Talk with Debug Agent' }];
};

export async function loader(args: LoaderFunctionArgs) {
  return json({ url: args.params.url });
}

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly>{() => <ProjectImport />}</ClientOnly>
    </div>
  );
}
