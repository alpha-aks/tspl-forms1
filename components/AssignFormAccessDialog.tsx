'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  FileText,
  Loader2,
  ShieldCheck,
  CheckCheck,
  X,
  UserRound,
  Info,
} from 'lucide-react';

import {
  getAvailableFormsForAssignment,
  getUserFormAssignments,
  updateUserFormAssignments,
} from '@/app/actions/admin-management';

interface AssignFormAccessDialogProps {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    employeeId: string;
    role: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormItem = {
  id: number;
  name: string;
  description: string;
  published: boolean;
  status: string;
};

export default function AssignFormAccessDialog({
  user,
  open,
  onOpenChange,
}: AssignFormAccessDialogProps) {
  const [forms, setForms] = useState<FormItem[]>([]);
  const [selectedFormIds, setSelectedFormIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, startTransition] = useTransition();

  /**
   * Load all available forms and the forms currently
   * assigned to the selected employee.
   */
  useEffect(() => {
    if (!open || !user) {
      return;
    }

    let isMounted = true;

    const loadFormAssignments = async () => {
      setLoading(true);

      try {
        const [availableForms, assignedIds] = await Promise.all([
          getAvailableFormsForAssignment(),
          getUserFormAssignments(user.id),
        ]);

        if (!isMounted) {
          return;
        }

        setForms(availableForms);
        setSelectedFormIds(assignedIds);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }

        toast({
          title: 'Error loading form assignments',
          description:
            err?.message || 'Could not fetch available forms and permissions.',
          variant: 'destructive',
        });

        setForms([]);
        setSelectedFormIds([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFormAssignments();

    return () => {
      isMounted = false;
    };
  }, [open, user]);

  /**
   * Toggle access for an individual form.
   */
  const toggleForm = (formId: number) => {
    setSelectedFormIds((previousIds) => {
      if (previousIds.includes(formId)) {
        return previousIds.filter((id) => id !== formId);
      }

      return [...previousIds, formId];
    });
  };

  /**
   * Give the employee access to every available form.
   */
  const handleSelectAll = () => {
    setSelectedFormIds(forms.map((form) => form.id));
  };

  /**
   * Remove access from every currently available form.
   */
  const handleClearAll = () => {
    setSelectedFormIds([]);
  };

  /**
   * Check whether every available form is currently selected.
   */
  const allFormsSelected = useMemo(() => {
    return forms.length > 0 && selectedFormIds.length === forms.length;
  }, [forms, selectedFormIds]);

  /**
   * Number of published forms currently selected.
   */
  const selectedPublishedCount = useMemo(() => {
    return forms.filter(
      (form) => form.published && selectedFormIds.includes(form.id)
    ).length;
  }, [forms, selectedFormIds]);

  /**
   * Number of draft forms currently selected.
   */
  const selectedDraftCount = useMemo(() => {
    return forms.filter(
      (form) => !form.published && selectedFormIds.includes(form.id)
    ).length;
  }, [forms, selectedFormIds]);

  /**
   * Save the employee's form permissions.
   */
  const handleSave = () => {
    if (!user) {
      return;
    }

    startTransition(async () => {
      try {
        await updateUserFormAssignments(user.id, selectedFormIds);

        toast({
          title: 'Form Access Updated',
          description: `Assigned ${selectedFormIds.length} form(s) to ${user.firstName} ${user.lastName}.`,
        });

        onOpenChange(false);
      } catch (err: any) {
        toast({
          title: 'Failed to update access',
          description:
            err?.message || 'An error occurred while updating permissions.',
          variant: 'destructive',
        });
      }
    });
  };

  /**
   * Reset the dialog state when it is closed.
   */
  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && !saving) {
      setForms([]);
      setSelectedFormIds([]);
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Assign Form Visibility Access
          </DialogTitle>

          <DialogDescription className="text-xs">
            Manage which forms this employee is authorized to access, view,
            and fill out.
          </DialogDescription>
        </DialogHeader>

        {/* Employee Information */}
        {user && (
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserRound className="h-4 w-4 text-primary" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {user.firstName} {user.lastName}
                  </span>

                  <Badge variant="secondary" className="text-[10px]">
                    {user.role}
                  </Badge>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Employee ID:{' '}
                  <span className="font-medium text-foreground">
                    {user.employeeId}
                  </span>
                </p>

                <p className="text-[11px] text-muted-foreground">
                  Select the forms that this employee should be able to access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-3 h-7 w-7 animate-spin text-primary" />

            <p className="text-xs font-medium text-foreground">
              Loading form permissions...
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Fetching available forms and existing assignments.
            </p>
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>

            <p className="text-sm font-semibold text-foreground">
              No Forms Available
            </p>

            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              No forms have been created yet in the system. Create and publish
              a form before assigning access to employees.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Permission Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border bg-muted/20 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">
                  {forms.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Total Forms
                </p>
              </div>

              <div className="rounded-md border bg-primary/5 p-2.5 text-center">
                <p className="text-lg font-bold text-primary">
                  {selectedFormIds.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Selected
                </p>
              </div>

              <div className="rounded-md border bg-muted/20 p-2.5 text-center">
                <p className="text-lg font-bold text-foreground">
                  {forms.length - selectedFormIds.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Not Selected
                </p>
              </div>
            </div>

            {/* Available Forms Header */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Available Forms ({forms.length})
                </p>

                <p className="text-[11px] text-muted-foreground">
                  Choose the forms this employee should have access to.
                </p>
              </div>

              <Badge variant="outline" className="shrink-0 text-[10px]">
                {selectedFormIds.length} Selected
              </Badge>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center justify-between rounded-md border bg-muted/20 p-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={allFormsSelected || saving}
                  className="h-7 gap-1.5 px-2.5 text-[11px]"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Select All
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={selectedFormIds.length === 0 || saving}
                  className="h-7 gap-1.5 px-2.5 text-[11px]"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear All
                </Button>
              </div>

              <div className="hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
                <Info className="h-3 w-3" />
                Click a form to toggle access
              </div>
            </div>

            {/* Forms List */}
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-md border bg-muted/10 p-2">
              {forms.map((form) => {
                const isChecked = selectedFormIds.includes(form.id);

                return (
                  <div
                    key={form.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleForm(form.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleForm(form.id);
                      }
                    }}
                    className={`flex items-center justify-between gap-3 rounded-md border p-2.5 text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'border-primary/40 bg-primary/10 shadow-sm'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleForm(form.id)}
                          aria-label={`Select ${form.name}`}
                        />
                      </div>

                      <div className="flex min-w-0 flex-col">
                        <span
                          className={`flex items-center gap-1.5 ${
                            isChecked
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />

                          <span className="truncate">{form.name}</span>
                        </span>

                        {form.description && (
                          <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {form.description}
                          </span>
                        )}

                        {form.status && (
                          <span className="mt-0.5 text-[10px] text-muted-foreground">
                            Status: {form.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={form.published ? 'default' : 'secondary'}
                      className="shrink-0 px-2 py-0 text-[10px]"
                    >
                      {form.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Selection Details */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedFormIds.length}
                </span>{' '}
                form(s) selected
              </div>

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>
                  Published:{' '}
                  <strong className="text-foreground">
                    {selectedPublishedCount}
                  </strong>
                </span>

                <span>
                  Draft:{' '}
                  <strong className="text-foreground">
                    {selectedDraftCount}
                  </strong>
                </span>
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-2 w-full gap-2 font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Permissions...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Save Form Permissions ({selectedFormIds.length})
                </>
              )}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground">
              These permissions control which forms the employee can access
              from the system.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
