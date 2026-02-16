import { useState, useMemo } from 'react';
import { useProjectFilesManifest } from '../../hooks/useProjectFilesManifest';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Copy, Search, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectFilesSection() {
  const { data: manifest, isLoading, isError, error } = useProjectFilesManifest();
  const [filter, setFilter] = useState('');

  // Filter files case-insensitively
  const filteredFiles = useMemo(() => {
    if (!manifest?.files) return [];
    
    if (!filter.trim()) {
      return manifest.files;
    }
    
    const lowerFilter = filter.toLowerCase();
    return manifest.files.filter(file => 
      file.toLowerCase().includes(lowerFilter)
    );
  }, [manifest?.files, filter]);

  const handleCopyList = async () => {
    try {
      const textToCopy = filteredFiles.join('\n');
      await navigator.clipboard.writeText(textToCopy);
      toast.success(`Copied ${filteredFiles.length} file path${filteredFiles.length === 1 ? '' : 's'} to clipboard`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy to clipboard. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Project Files</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading project files...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Project Files</h3>
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Failed to load project files</p>
            <p className="text-xs mt-1">{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Project Files</h3>
        <Badge variant="outline" className="text-xs">
          {filteredFiles.length} {filter.trim() ? `of ${manifest?.fileCount || 0}` : 'files'}
        </Badge>
      </div>

      {/* Filter Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* File List */}
      <ScrollArea className="h-64 w-full rounded border bg-muted/30">
        <div className="p-3 space-y-1">
          {filteredFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {filter.trim() ? 'No files match your filter' : 'No files found'}
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={index}
                className="text-xs font-mono text-foreground/80 hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded transition-colors"
              >
                {file}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Copy Action */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          {manifest?.generatedAt && (
            <>Generated {new Date(manifest.generatedAt).toLocaleString()}</>
          )}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyList}
          disabled={filteredFiles.length === 0}
          className="h-8 gap-2"
        >
          <Copy className="h-3 w-3" />
          Copy list
        </Button>
      </div>
    </div>
  );
}
