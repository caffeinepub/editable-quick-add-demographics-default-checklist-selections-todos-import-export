import { useState, useMemo, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useListCases, useExportCases, useImportCases } from '../hooks/useQueries';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { hasCaseListCache } from '../utils/offlineDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, FileText, Download, Upload, WifiOff } from 'lucide-react';
import { formatDate } from '../utils/dateTime';
import { toast } from 'sonner';
import { parseCsvToSurgeryCases } from '../utils/surgeryCaseCsvImport';
import type { SurgeryCase, Species } from '../backend';
import { useEffect } from 'react';

type SortOption = 'arrival-newest' | 'arrival-oldest' | 'mrn-asc';

export default function CaseListPage() {
  const navigate = useNavigate();
  const { data: cases = [], isLoading, error } = useListCases();
  const { isOffline } = useOfflineStatus();
  const { identity } = useInternetIdentity();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('arrival-newest');
  const [hasCache, setHasCache] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const exportCases = useExportCases();
  const importCases = useImportCases();

  const principal = identity?.getPrincipal().toString();

  useEffect(() => {
    if (principal) {
      hasCaseListCache(principal).then(setHasCache);
    }
  }, [principal]);

  const filteredAndSortedCases = useMemo(() => {
    // First filter
    let filtered = cases;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = cases.filter(
        (c) =>
          c.mrn.toLowerCase().includes(term) ||
          c.patientFirstName.toLowerCase().includes(term) ||
          c.patientLastName.toLowerCase().includes(term)
      );
    }

    // Then sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'arrival-newest':
        sorted.sort((a, b) => Number(b.arrivalDate - a.arrivalDate));
        break;
      case 'arrival-oldest':
        sorted.sort((a, b) => Number(a.arrivalDate - b.arrivalDate));
        break;
      case 'mrn-asc':
        sorted.sort((a, b) => a.mrn.localeCompare(b.mrn));
        break;
    }

    return sorted;
  }, [cases, searchTerm, sortBy]);

  const getSpeciesBadgeVariant = (species: Species) => {
    if (species === 'canine') return 'default';
    if (species === 'feline') return 'secondary';
    return 'outline';
  };

  const getSpeciesLabel = (species: Species) => {
    if (species === 'canine') return 'Canine';
    if (species === 'feline') return 'Feline';
    return 'Other';
  };

  const handleExport = async () => {
    try {
      const data = await exportCases.mutateAsync();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surgery-cases-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Cases exported successfully');
    } catch (error) {
      toast.error('Failed to export cases');
      console.error('Export error:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      let casesToImport: SurgeryCase[];
      
      if (fileExtension === 'csv') {
        // Parse CSV
        try {
          casesToImport = parseCsvToSurgeryCases(text);
        } catch (error: any) {
          toast.error(error.message || 'Failed to parse CSV file');
          return;
        }
      } else if (fileExtension === 'json') {
        // Parse JSON
        const data = JSON.parse(text);
        
        // Validate that it's an array
        if (!Array.isArray(data)) {
          toast.error('Invalid file format: expected an array of cases');
          return;
        }

        // Convert bigint fields from JSON (they come as strings or numbers)
        casesToImport = data.map((c: any) => ({
          ...c,
          id: BigInt(c.id),
          arrivalDate: BigInt(c.arrivalDate),
          notes: c.notes || '', // Default to empty string if missing
          todos: c.todos?.map((t: any) => ({
            ...t,
            id: BigInt(t.id),
          })) || [],
        }));
      } else {
        toast.error('Unsupported file format. Please use .json or .csv files.');
        return;
      }

      await importCases.mutateAsync(casesToImport);
      toast.success(`Successfully imported ${casesToImport.length} case(s)`);
    } catch (error: any) {
      if (error.message && error.message.includes('CSV validation failed')) {
        // CSV validation error already has detailed message
        toast.error(error.message);
      } else {
        toast.error('Failed to import cases. Please check the file format.');
      }
      console.error('Import error:', error);
    } finally {
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cases...</p>
        </div>
      </div>
    );
  }

  // Show offline empty state if offline and no cache
  if (isOffline && hasCache === false && cases.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <WifiOff className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Offline Mode</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You're currently offline. Case data must be loaded at least once while online to view it offline.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Surgery Cases</h1>
          <p className="text-muted-foreground mt-1">
            {cases.length} {cases.length === 1 ? 'case' : 'cases'} total
            {isOffline && cases.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                Cached
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportCases.isPending || cases.length === 0 || isOffline}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            disabled={importCases.isPending || isOffline}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button onClick={() => navigate({ to: '/cases/new' })} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Case
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by MRN or patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Sort by:</span>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arrival-newest">Arrival Date (Newest)</SelectItem>
                  <SelectItem value="arrival-oldest">Arrival Date (Oldest)</SelectItem>
                  <SelectItem value="mrn-asc">MRN (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No cases found' : 'No cases yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Get started by creating your first surgery case'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate({ to: '/cases/new' })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Case
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MRN</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Arrival Date</TableHead>
                    <TableHead>Presenting Complaint</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedCases.map((caseItem) => (
                    <TableRow
                      key={caseItem.id.toString()}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate({ to: `/cases/${caseItem.id}` })}
                    >
                      <TableCell className="font-medium">{caseItem.mrn}</TableCell>
                      <TableCell>
                        {caseItem.patientFirstName} {caseItem.patientLastName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSpeciesBadgeVariant(caseItem.species)}>
                          {getSpeciesLabel(caseItem.species)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(caseItem.arrivalDate)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {caseItem.presentingComplaint}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ to: `/cases/${caseItem.id}` });
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
