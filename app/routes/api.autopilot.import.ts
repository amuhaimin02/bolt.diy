import type { ActionFunction } from '@remix-run/node';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface ProjectDocument {
  action: string;
  document_type: string;
  sub_dir: string;
  file_name: string;
  agent: string;
  datetime: string;
  document_id: number;
  file_dir: string;
  blob_dir: string;
  artifact_dir: string;
}

interface ProjectDetails {
  client_id: string;
  unique_projectname: string;
  project_name: string;
  status: string;
  last_update_time: string;
  icon: string;
  original_idea: string;
  idea: string;
  autopilot: boolean;
  project_mode: string;
}

interface ProjectFile {
  name: string;
  content: string;
}

interface ProjectImportResponse {
  project_name: string;
  files: ProjectFile[];
}

const AUTOPILOT_AI_URL = process.env.AUTOPILOT_AI_URL;

async function fetchJSON(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function importProject(projectHex: string): Promise<ProjectImportResponse> {
  const projectDetails = await handleProjectDetails(projectHex);
  const projectFiles = await handleFileRead(projectHex);

  return { project_name: projectDetails.project_name, files: projectFiles };
}

async function handleProjectDetails(projectHex: string): Promise<ProjectDetails> {
  const url = `${AUTOPILOT_AI_URL}/database/get_projects?project_hex=${projectHex}`;
  const projectData = await fetchJSON(url);

  if (!Array.isArray(projectData) || projectData.length === 0) {
    throw new Error('Unexpected response format: Expected a non-empty list');
  }

  return projectData[0] as ProjectDetails;
}

async function handleFileRead(projectHex: string): Promise<ProjectFile[]> {
  const url = `${AUTOPILOT_AI_URL}/database/retrieve_raw_html_files/${projectHex}`;
  const documentList = (await fetchJSON(url)) as ProjectDocument[];

  const projectFiles: ProjectFile[] = await Promise.all(
    documentList.map(async (document) => {
      const blobUrl = `${AUTOPILOT_AI_URL}/azure_storage/get_blob/${document.blob_dir}`;
      const content = await fetch(blobUrl).then((res) => res.text());

      return { name: document.file_name, content };
    }),
  );

  return projectFiles;
}

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { projectHex } = (await request.json()) as { projectHex: string };

  if (!projectHex) {
    return new Response(JSON.stringify({ error: 'Missing projectHex parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await importProject(projectHex);
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
