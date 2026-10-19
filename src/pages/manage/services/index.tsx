import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlaceholderBadge, ToneBadge } from "@/components/common/status-badge";
import { PageHeader } from "@/components/common/page-header";
import { QueryState } from "@/components/common/query-state";
import { RecipeFormDialog } from "@/components/services/recipe-form-dialog";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import { listInventory } from "@/lib/api/inventory";
import { deleteConsumable, listConsumables, listServices, setServiceActive } from "@/lib/api/services";
import { formatCurrency } from "@/lib/format";
import { servicePricingSummary, serviceTurnaround } from "@/lib/pricing";
import { alertError, confirmAction, errorMessageFrom, flashSuccess } from "@/lib/alerts";

export default function ManageServices() {
  const queryClient = useQueryClient();
  const [showHidden, setShowHidden] = useState(false);

  const servicesQuery = useQuery({
    queryKey: ["services", "admin", showHidden],
    queryFn: () => listServices({ includeInactive: showHidden }),
  });
  const consumablesQuery = useQuery({ queryKey: ["consumables"], queryFn: listConsumables });
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: listInventory });

  const services = servicesQuery.data ?? [];
  const consumables = consumablesQuery.data ?? [];
  const items = inventoryQuery.data ?? [];

  const toggleService = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setServiceActive(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      flashSuccess("Service availability updated");
    },
    onError: async (error) => alertError("The service could not be updated", errorMessageFrom(error)),
  });

  const removeRecipe = useMutation({
    mutationFn: async (id: string) => {
      const confirmed = await confirmAction({
        title: "Remove this consumption rule?",
        text: "Stock will stop being deducted for this service until a new rule is added.",
        confirmLabel: "Remove rule",
        danger: true,
      });
      if (!confirmed) return false;
      await deleteConsumable(id);
      return true;
    },
    onSuccess: async (done) => {
      if (!done) return;
      await queryClient.invalidateQueries({ queryKey: ["consumables"] });
      flashSuccess("Consumption rule removed");
    },
    onError: async (error) => alertError("The rule could not be removed", errorMessageFrom(error)),
  });

  const hasPlaceholders =
    services.some((service) => service.is_placeholder) ||
    consumables.some((recipe) => recipe.is_placeholder);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services, prices & consumption"
        description="What the shop sells, what it costs, and how much stock each service uses."
        actions={<ServiceFormDialog />}
      />

      {hasPlaceholders ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-muted-foreground">
              The flagged values below were seeded as starting points, not as real shop figures. Edit each one
              to match your price list and your actual supply usage — saving a row clears its placeholder flag.
            </span>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg">Service catalogue</CardTitle>
            <p className="text-sm text-muted-foreground">
              Only the services the shop offers are listed. A hidden service stays saved but never
              appears to customers.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={showHidden}
              onCheckedChange={setShowHidden}
              aria-label="Show hidden services"
            />
            Show hidden
          </label>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={servicesQuery.isLoading}
            error={servicesQuery.error}
            isEmpty={services.length === 0}
            emptyIcon={Package}
            emptyTitle="No services yet"
            emptyDescription="Add the services customers can book and the price of each one."
            emptyAction={<ServiceFormDialog />}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60">
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Turnaround</TableHead>
                    <TableHead>On the site</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{service.name}</span>
                          {service.is_placeholder ? <PlaceholderBadge /> : null}
                        </span>
                        {service.description ? (
                          <span className="block max-w-[360px] text-xs text-muted-foreground">
                            {service.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{service.category ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">
                        {formatCurrency(service.price)}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {servicePricingSummary(service)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {serviceTurnaround(service)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Switch
                            checked={service.is_active}
                            onCheckedChange={(checked) =>
                              toggleService.mutate({ id: service.id, isActive: checked })
                            }
                            aria-label={`Show ${service.name} on the website`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {service.is_active ? "Visible" : "Hidden"}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <ServiceFormDialog
                            service={service}
                            trigger={
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg">Consumption rules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Applied automatically when an order reaches the consumption stage set in shop settings. “Per
              wash” rules deduct a fixed amount for every load the service represents.
            </p>
          </div>
          <RecipeFormDialog services={services} items={items} />
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={consumablesQuery.isLoading}
            error={consumablesQuery.error}
            isEmpty={consumables.length === 0}
            emptyTitle="No consumption rules yet"
            emptyDescription="Without a rule, stock is not deducted automatically and staff must adjust stock manually."
            emptyAction={<RecipeFormDialog services={services} items={items} />}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/60">
                    <TableHead>Service</TableHead>
                    <TableHead>Supply</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumables.map((recipe) => {
                    const item = items.find((candidate) => candidate.id === recipe.inventory_item_id);
                    return (
                      <TableRow key={recipe.id}>
                        <TableCell className="font-medium text-foreground">
                          {recipe.services?.name ?? "Service"}
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-foreground">{item?.name ?? "Supply"}</span>
                            {recipe.is_placeholder ? <PlaceholderBadge /> : null}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {Number(recipe.qty_per_unit)} {recipe.unit ?? item?.unit ?? ""}
                          <span className="block text-xs">
                            {recipe.basis === "wash" ? "per wash" : "per kg / piece"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <RecipeFormDialog
                              services={services}
                              items={items}
                              existing={{
                                id: recipe.id,
                                service_id: recipe.service_id,
                                inventory_item_id: recipe.inventory_item_id,
                                qty_per_unit: Number(recipe.qty_per_unit),
                                basis: recipe.basis,
                              }}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeRecipe.mutate(recipe.id)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Remove rule</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </QueryState>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <ToneBadge tone="info">Tip</ToneBadge> To adjust a supply level by hand — a delivery, a spill, or a
        corrected count — use Supplies &amp; stock, not this page.
      </p>
    </div>
  );
}
