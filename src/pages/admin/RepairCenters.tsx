import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface RepairCenter {
  id: string;
  name: string;
  region: string;
  email: string;
  created_at: string;
}

export default function RepairCenters() {
  const [centers, setCenters] = useState<RepairCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<RepairCenter | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    email: "",
  });

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      const { data, error } = await supabase
        .from("repair_centers")
        .select("*")
        .order("region", { ascending: true });

      if (error) throw error;
      setCenters(data || []);
    } catch (error: any) {
      toast.error("Failed to load repair centers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCenter) {
        const { error } = await supabase
          .from("repair_centers")
          .update(formData)
          .eq("id", editingCenter.id);

        if (error) throw error;
        toast.success("Repair center updated successfully");
      } else {
        const { error } = await supabase
          .from("repair_centers")
          .insert([formData]);

        if (error) throw error;
        toast.success("Repair center created successfully");
      }

      setDialogOpen(false);
      resetForm();
      loadCenters();
    } catch (error: any) {
      toast.error(error.message || "Failed to save repair center");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this repair center?")) return;

    try {
      const { error } = await supabase
        .from("repair_centers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Repair center deleted successfully");
      loadCenters();
    } catch (error: any) {
      toast.error("Failed to delete repair center");
    }
  };

  const openEditDialog = (center: RepairCenter) => {
    setEditingCenter(center);
    setFormData({
      name: center.name,
      region: center.region,
      email: center.email,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCenter(null);
    setFormData({ name: "", region: "", email: "" });
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
            <h1 className="text-3xl font-bold">Repair Centers</h1>
            <p className="text-muted-foreground mt-1">
              Manage repair center locations and contacts
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Center
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCenter ? "Edit Repair Center" : "Add Repair Center"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Center Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingCenter ? "Update" : "Create"}
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
            <CardTitle>All Repair Centers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      No repair centers found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  centers.map((center) => (
                    <TableRow key={center.id}>
                      <TableCell className="font-medium">{center.name}</TableCell>
                      <TableCell>{center.region}</TableCell>
                      <TableCell>{center.email}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(center)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(center.id)}
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
