import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, Package } from "lucide-react";

interface RepairCenter {
  id: string;
  name: string;
  region: string;
  email: string;
}

interface RepairCenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairCenter: RepairCenter | null;
  productName: string;
  onConfirm: () => void;
  loading: boolean;
}

export function RepairCenterDialog({
  open,
  onOpenChange,
  repairCenter,
  productName,
  onConfirm,
  loading,
}: RepairCenterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Repair Center</DialogTitle>
          <DialogDescription>
            Based on the product type, we recommend the following repair center
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{productName}</p>
            </div>
          </div>

          {repairCenter ? (
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-primary/5">
              <Building2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-primary mb-1">
                  {repairCenter.name}
                </p>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Region: {repairCenter.region}
                  </p>
                  <p className="text-muted-foreground">
                    Contact: {repairCenter.email}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-destructive/5 border-destructive/20">
              <p className="text-sm text-destructive">
                No repair center found for this product type. Please assign a product
                category to a repair center first.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading || !repairCenter}>
            {loading ? "Confirming..." : "Confirm & Move to In Repair"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
