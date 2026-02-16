import { useQuery } from '@tanstack/react-query';

interface ProjectFilesManifest {
  generatedAt: string;
  fileCount: number;
  files: string[];
}

export function useProjectFilesManifest() {
  return useQuery<ProjectFilesManifest>({
    queryKey: ['projectFilesManifest'],
    queryFn: async () => {
      const response = await fetch('/assets/project-files-manifest.json');
      
      if (!response.ok) {
        throw new Error(`Failed to load project files manifest: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate manifest structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid manifest format: expected an object');
      }
      
      if (!Array.isArray(data.files)) {
        throw new Error('Invalid manifest format: files must be an array');
      }
      
      return {
        generatedAt: data.generatedAt || new Date().toISOString(),
        fileCount: data.fileCount || data.files.length,
        files: data.files,
      };
    },
    staleTime: Infinity, // Manifest is static per build
    retry: 1,
  });
}
