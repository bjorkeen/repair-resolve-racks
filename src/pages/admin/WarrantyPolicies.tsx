import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface WarrantyPolicy {
  id: string;
  months: number;
  description: string;
  created_at: string;
}

export default function WarrantyPolicies() {
  const [policies, setPolicies] = useState<WarrantyPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<WarrantyPolicy | null>(null);
  const [formData, setFormData] = useState({
    months: "",
    description: "",
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from("warranty_policies")
        .select("*")
        .order("months", { ascending: true });

      if (error) throw error;
      setPolicies(data || []);
    } catch (error: any) {
      toast.error("Failed to load warranty policies");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const policyData = {
        months: parseInt(formData.months),
        description: formData.description,
      };

      if (editingPolicy) {
        const { error } = await supabase
          .from("warranty_policies")
          .update(policyData)
          .eq("id", editingPolicy.id);

        if (error) throw error;
        toast.success("Warranty policy updated successfully");
      } else {
        const { error } = await supabase
          .from("warranty_policies")
          .insert([policyData]);

        if (error) throw error;
        toast.success("Warranty policy created successfully");
      }

      setDialogOpen(false);
      resetForm();
      loadPolicies();
    } catch (error: any) {
      toast.error(error.message || "Failed to save warranty policy");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this warranty policy?")) return;

    try {
      const { error } = await supabase
        .from("warranty_policies")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Warranty policy deleted successfully");
      loadPolicies();
    } catch (error: any) {
      toast.error("Failed to delete warranty policy");
    }
  };

  const openEditDialog = (policy: WarrantyPolicy) => {
    setEditingPolicy(policy);
    setFormData({
      months: policy.months.toString(),
      description: policy.description,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPolicy(null);
    setFormData({ months: "", description: "" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Warranty Policies</h1>
            <p className="text-muted-foreground mt-1">
              Manage warranty coverage periods and terms
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPolicy ? "Edit Warranty Policy" : "Add Warranty Policy"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="months">Duration (months)</Label>
                  <Input
                    id="months"
                    type="number"
                    min="1"
                    value={formData.months}
                    onChange={(e) =>
                      setFormData({ ...formData, months: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingPolicy ? "Update" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Warranty Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Duration</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      No warranty policies found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        {policy.months} months
                      </TableCell>
                      <TableCell>{policy.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(policy)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(policy.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
