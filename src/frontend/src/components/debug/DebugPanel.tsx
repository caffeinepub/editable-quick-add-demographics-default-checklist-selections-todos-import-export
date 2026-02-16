import { useState } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useActor } from '../../hooks/useActor';
import { useCallerRoleDebug } from '../../hooks/useCallerRoleDebug';
import { useProvisioningStatus } from '../../hooks/useProvisioningStatus';
import { useListCases, useGetCaseCount } from '../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Copy, X, CheckCircle2, XCircle, Clock, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '../../utils/safeErrorMessage';
import { detectStoppedCanister, getStoppedCanisterExplanation, getStoppedCanisterAction } from '../../utils/icStoppedCanisterError';
import ProjectFilesSection from './ProjectFilesSection';

interface DebugPanelProps {
  onClose: () => void;
}

export default function DebugPanel({ onClose }: DebugPanelProps) {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: roleData, isLoading: roleLoading } = useCallerRoleDebug(true);
  const provisioningStatus = useProvisioningStatus();
  const { data: cases, isLoading: casesLoading, isError: casesError, refetch: refetchCases } = useListCases();
  const { data: caseCount, isLoading: caseCountLoading, isError: caseCountError, refetch: refetchCaseCount } = useGetCaseCount();
  const queryClient = useQueryClient();

  const principalString = identity?.getPrincipal().toString();
  const principalDisplay = principalString || 'Not logged in';
  const [copied, setCopied] = useState(false);

  // Read actor query error from React Query cache using the correct key structure
  const actorQueryKey = ['actor', principalString];
  const actorQueryState = queryClient.getQueryState(actorQueryKey);
  const actorError = actorQueryState?.error;

  // Detect stopped canister error
  const errorMessage = actorError ? safeErrorMessage(actorError) : '';
  const stoppedCanisterInfo = detectStoppedCanister(errorMessage);

  const handleCopy = () => {
    navigator.clipboard.writeText(principalDisplay);
    setCopied(true);
    toast.success('Principal copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshCases = async () => {
    try {
      const results = await Promise.allSettled([refetchCases(), refetchCaseCount()]);
      
      const listFailed = results[0].status === 'rejected';
      const countFailed = results[1].status === 'rejected';
      
      if (listFailed && countFailed) {
        toast.error('Failed to refresh case counts');
      } else if (listFailed || countFailed) {
        toast.success('Case counts partially refreshed');
      } else {
        toast.success('Case counts refreshed');
      }
    } catch (error) {
      toast.error('Failed to refresh case counts');
    }
  };

  const getActorStatusBadge = () => {
    if (!actor) {
      return <Badge variant="destructive">Not Ready</Badge>;
    }
    if (actorFetching) {
      return <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Initializing
      </Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Ready</Badge>;
  };

  const getRoleBadge = () => {
    if (roleLoading) {
      return <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading
      </Badge>;
    }

    if (!roleData) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    if (roleData.role === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    }

    const colorMap = {
      admin: 'bg-purple-600',
      user: 'bg-green-600',
      guest: 'bg-yellow-600',
    };

    return (
      <Badge variant="default" className={colorMap[roleData.role]}>
        {roleData.role.charAt(0).toUpperCase() + roleData.role.slice(1)}
      </Badge>
    );
  };

  const getListCasesCountDisplay = () => {
    if (casesLoading) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading
        </Badge>
      );
    }

    if (casesError) {
      return <Badge variant="destructive">Error</Badge>;
    }

    if (!cases) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    return (
      <Badge variant="default" className="bg-blue-600">
        {cases.length}
      </Badge>
    );
  };

  const getCaseCountDisplay = () => {
    if (caseCountLoading) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading
        </Badge>
      );
    }

    if (caseCountError) {
      return <Badge variant="destructive">Error</Badge>;
    }

    if (caseCount === undefined) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    return (
      <Badge variant="default" className="bg-blue-600">
        {caseCount}
      </Badge>
    );
  };

  const getProvisioningStatusIcon = () => {
    switch (provisioningStatus.state) {
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'timeout':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'idle':
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProvisioningStatusText = () => {
    switch (provisioningStatus.state) {
      case 'succeeded':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'timeout':
        return 'Timed Out';
      case 'running':
        return 'In Progress';
      case 'idle':
      default:
        return 'Idle';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">Debug Panel</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Principal */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Principal ID</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono break-all">
                {principalDisplay}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Actor Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Backend Actor</h3>
            <div className="flex items-center gap-2">
              {getActorStatusBadge()}
              {actorFetching && (
                <span className="text-xs text-muted-foreground">
                  Connecting to backend...
                </span>
              )}
            </div>
          </div>

          {/* Backend Actor Error */}
          {actorError && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Backend Actor Error</h3>
              
              {/* User-friendly explanation for stopped canister */}
              {stoppedCanisterInfo.isStopped && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        {getStoppedCanisterExplanation(stoppedCanisterInfo)}
                      </p>
                      <p className="text-orange-700 dark:text-orange-300">
                        <strong>Next step:</strong> {getStoppedCanisterAction()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw error for debugging */}
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive break-words">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Role */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Current Role</h3>
            <div className="flex items-center gap-2">
              {getRoleBadge()}
              {roleData?.error && (
                <span className="text-xs text-destructive">{roleData.error}</span>
              )}
            </div>
          </div>

          {/* Case Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Case Count</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefreshCases}
                disabled={casesLoading || caseCountLoading}
                className="h-6 w-6"
              >
                <RefreshCw className={`h-3 w-3 ${casesLoading || caseCountLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="space-y-2">
              {/* Count from listCases */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-32">From listCases:</span>
                {getListCasesCountDisplay()}
                {casesError && (
                  <span className="text-xs text-destructive">Failed to load</span>
                )}
              </div>
              {/* Count from getCaseCount */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-32">From getCaseCount:</span>
                {getCaseCountDisplay()}
                {caseCountError && (
                  <span className="text-xs text-destructive">Failed to load</span>
                )}
              </div>
            </div>
          </div>

          {/* Provisioning Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Role Provisioning</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getProvisioningStatusIcon()}
                <span className="text-sm font-medium">{getProvisioningStatusText()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Retry Count:</span>{' '}
                  <span className="font-mono">{provisioningStatus.retryCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Elapsed:</span>{' '}
                  <span className="font-mono">
                    {(provisioningStatus.elapsedMs / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
              {provisioningStatus.lastError && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                  {provisioningStatus.lastError}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Project Files Section */}
          <ProjectFilesSection />

          {/* Help Text */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Expected flow:</strong> After login, role provisioning should complete
              within a few seconds, changing your role from "Guest" to "User".
            </p>
            <p>
              If provisioning is stuck or your role remains "Guest", try logging out and back in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
