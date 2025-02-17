import { createChatFromFolder } from '~/utils/folderImport';
import type { ChatHistoryItem } from '~/lib/persistence/useChatHistory';

interface ProjectFiles {
  name: string;
  content: string;
}

const importAutopilotProject = async (projectHex: string): Promise<ChatHistoryItem> => {
  try {
    const response = await fetch(`/api/autopilot/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectHex }),
    });

    const data = (await response.json()) as Record<string, unknown>;
    const filesArray = data.files as ProjectFiles[];

    // Convert ProjectFiles[] into File[]
    const files = filesArray.map(({ name, content }) => {
      // Convert content string into a Blob
      const blob = new Blob([content], { type: 'text/plain' }); // Adjust MIME type as needed
      return new File([blob], name, { type: blob.type });
    });

    const projectName = data.project_name as string;

    const messages = await createChatFromFolder(files, [], projectName);

    return {
      id: projectHex,
      urlId: projectHex,
      description: projectName,
      messages,
      timestamp: new Date().toISOString(), // Current time
    } as ChatHistoryItem;
  } catch (err) {
    throw err;
  }
};

export { importAutopilotProject };
