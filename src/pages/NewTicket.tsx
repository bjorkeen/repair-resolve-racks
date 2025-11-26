import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { differenceInMonths } from "date-fns";

const ticketSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters").max(100),
  customerEmail: z.string().email("Invalid email address").max(255),
  productId: z.string().uuid("Please select a product"),
  serialNumber: z.string().min(3, "Serial number is required").max(50),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  issue: z.string().min(10, "Please describe the issue in detail").max(1000),
  ticketType: z.enum(["REPAIR", "RETURN"], { required_error: "Please select a ticket type" }),
  returnReason: z.enum(["WITHIN_15_DAYS", "AFTER_15_DAYS"]).optional(),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS = 5;

export default function NewTicket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: user?.email || "",
    productId: "",
    serialNumber: "",
    purchaseDate: "",
    issue: "",
    ticketType: "" as "REPAIR" | "RETURN" | "",
    returnReason: "" as "WITHIN_15_DAYS" | "AFTER_15_DAYS" | "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .in("product_type", ["PHONE", "LAPTOP", "APPLIANCES"])
      .order("name");
    setProducts(data || []);
  };

  const calculateWarrantyEligibility = (product: any, purchaseDate: string) => {
    if (!purchaseDate) return false;
    
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const monthsSincePurchase = differenceInMonths(now, purchase);
    
    return monthsSincePurchase <= product.warranty_months;
  };

  const isReturnEligible = () => {
    if (!formData.purchaseDate) return false;
    const purchase = new Date(formData.purchaseDate);
    const now = new Date();
    const daysSincePurchase = Math.floor((now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
    return daysSincePurchase <= 15;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > MAX_PHOTOS) {
      toast({
        variant: "destructive",
        title: "Too many files",
        description: `You can only upload up to ${MAX_PHOTOS} photos`,
      });
      return;
    }
    
    // Validate files
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
        });
        return false;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} must be a JPEG, PNG, or WebP image`,
        });
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validationData = {
        ...formData,
        returnReason: formData.ticketType === "RETURN" ? formData.returnReason : undefined,
      };
      ticketSchema.parse(validationData);

      // Get selected product
      const product = products.find((p) => p.id === formData.productId);
      if (!product) throw new Error("Product not found");

      // Validate return period
      if (formData.ticketType === "RETURN" && formData.returnReason === "WITHIN_15_DAYS") {
        if (!isReturnEligible()) {
          toast({
            variant: "destructive",
            title: "Return period expired",
            description: "Returns are only accepted within 15 days of purchase",
          });
          setLoading(false);
          return;
        }
      }

      // Calculate warranty eligibility
      const warrantyEligible = formData.purchaseDate
        ? calculateWarrantyEligibility(product, formData.purchaseDate)
        : false;

      // For out-of-warranty repairs, reject immediately with popup
      if (formData.ticketType === "REPAIR" && !warrantyEligible) {
        toast({
          variant: "destructive",
          title: "Out of Warranty",
          description: "We cannot process out-of-warranty repairs. This request will be rejected. Please contact Electronics for more information.",
        });
        setLoading(false);
        return;
      }

      // Determine initial status
      let initialStatus = "OPEN";
      if (formData.ticketType === "RETURN") {
        initialStatus = "RETURN_REQUESTED";
      }

      // Upload photos first to get URLs
      const photoUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `${user?.id}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("ticket-attachments")
            .upload(filePath, file);

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from("ticket-attachments")
              .getPublicUrl(filePath);
            photoUrls.push(publicUrl);
          }
        }
      }

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          owner_id: user?.id,
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          product_id: formData.productId,
          serial_number: formData.serialNumber,
          purchase_date: formData.purchaseDate || null,
          issue: formData.issue,
          warranty_eligible: warrantyEligible,
          status: initialStatus,
          ticket_type: formData.ticketType,
          return_reason: formData.ticketType === "RETURN" ? formData.returnReason : null,
          photos: photoUrls.length > 0 ? photoUrls : null,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Save attachment records for photos
      if (files.length > 0 && photoUrls.length > 0) {
        const attachmentPromises = files.map((file, index) => {
          const filePath = `${user?.id}/${Date.now()}-${file.name}`;
          return supabase.from("ticket_attachments").insert({
            ticket_id: ticket.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user?.id,
          });
        });
        await Promise.all(attachmentPromises);
      }

      // Create initial event
      await supabase.from("ticket_events").insert({
        ticket_id: ticket.id,
        by_user_id: user?.id,
        type: "CREATED",
        note: "Ticket created",
      });

      toast({
        title: "Ticket created successfully",
        description: `Ticket #${ticket.ticket_number} has been created.`,
      });

      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation error",
          description: error.errors[0].message,
        });
      } else {
        console.error("Error creating ticket:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create ticket. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Ticket</h1>
          <p className="text-muted-foreground mt-1">
            Submit a return or repair request for your electronic device
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Information</CardTitle>
            <CardDescription>
              Please provide detailed information about the issue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, customerEmail: e.target.value })
                      }
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Request Type</h3>
                <div className="space-y-2">
                  <Label htmlFor="ticketType">What would you like to do? *</Label>
                  <Select
                    value={formData.ticketType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, ticketType: value as "REPAIR" | "RETURN" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="REPAIR">Repair Product</SelectItem>
                      <SelectItem value="RETURN">Return Product</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose whether you want to repair the product or return it
                  </p>
                </div>
              </div>

              {/* Return Reason (conditional) */}
              {formData.ticketType === "RETURN" && (
                <div className="space-y-2">
                  <Label htmlFor="returnReason">Return Reason *</Label>
                  <Select
                    value={formData.returnReason}
                    onValueChange={(value) =>
                      setFormData({ ...formData, returnReason: value as "WITHIN_15_DAYS" | "AFTER_15_DAYS" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select return reason" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem 
                        value="WITHIN_15_DAYS" 
                        disabled={!isReturnEligible()}
                      >
                        Within 15 Days {!isReturnEligible() && "(Expired)"}
                      </SelectItem>
                      <SelectItem value="AFTER_15_DAYS">
                        After 15 Days (Special Request)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.purchaseDate && !isReturnEligible() && (
                    <p className="text-xs text-destructive">
                      Regular return period has expired. Select "After 15 Days" to submit a special request.
                    </p>
                  )}
                </div>
              )}

              {/* Product Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Product Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="product">Product *</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, productId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number *</Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, serialNumber: e.target.value })
                      }
                      placeholder="SN123456789"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseDate: e.target.value })
                    }
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required to determine warranty and return eligibility
                  </p>
                </div>
              </div>

              {/* Issue Description */}
              <div className="space-y-2">
                <Label htmlFor="issue">Issue Description *</Label>
                <Textarea
                  id="issue"
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  placeholder="Please describe the issue in detail..."
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters, maximum 1000 characters
                </p>
              </div>

              {/* Photo Upload (for REPAIR only) */}
              {formData.ticketType === "REPAIR" && (
                <div className="space-y-2">
                  <Label htmlFor="photos">Product Photos {files.length > 0 && `(${files.length}/${MAX_PHOTOS})`}</Label>
                  <Input
                    id="photos"
                    type="file"
                    onChange={handleFileChange}
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    disabled={loading || files.length >= MAX_PHOTOS}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload up to {MAX_PHOTOS} photos of the faulty product (max 5MB per photo, JPG/PNG/WebP only)
                  </p>
                  {files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded border bg-accent/50"
                      >
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={loading}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating..." : "Create Ticket"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/tickets")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
