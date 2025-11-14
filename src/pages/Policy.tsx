import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Package, Shield, Clock } from "lucide-react";

export default function Policy() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Repair & Warranty Policy</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about returns, repairs, and warranties
          </p>
        </div>

        {/* Return Policy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Return Policy</CardTitle>
                <p className="text-sm text-muted-foreground">Within 15 days of purchase</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3 className="font-semibold text-base">Standard Returns</h3>
              <ul className="space-y-2">
                <li>
                  Products can be returned <strong>within 15 days</strong> of purchase if unused 
                  and in original packaging.
                </li>
                <li>
                  To initiate a return, create a ticket and select <Badge variant="outline">Return within 15 days</Badge>
                </li>
                <li>
                  Returns must include all original accessories, manuals, and packaging materials.
                </li>
                <li>
                  Refunds will be processed within 5-7 business days after approval.
                </li>
              </ul>

              <h3 className="font-semibold text-base mt-6">Late Returns</h3>
              <ul className="space-y-2">
                <li>
                  Returns requested <strong>after 15 days</strong> are generally not accepted.
                </li>
                <li>
                  Special requests may be submitted for review on a case-by-case basis.
                </li>
                <li>
                  Restocking fees or partial refunds may apply to late return requests.
                </li>
              </ul>

              <div className="bg-muted p-4 rounded-lg mt-4">
                <p className="text-sm font-medium">💡 Pro Tip</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Make sure to test your product within the first few days of purchase to ensure 
                  you're eligible for a full refund if needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repair Policy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Repair Policy</CardTitle>
                <p className="text-sm text-muted-foreground">For faulty or damaged products</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h3 className="font-semibold text-base">How to Submit a Repair Request</h3>
              <ul className="space-y-2">
                <li>
                  If your product is faulty, submit a <Badge variant="outline">Faulty Product</Badge> request.
                </li>
                <li>
                  Upload up to 5 photos showing the issue for faster processing.
                </li>
                <li>
                  Our system will automatically check warranty eligibility based on your purchase date.
                </li>
                <li>
                  Provide a detailed description of the problem (minimum 10 characters).
                </li>
              </ul>

              <h3 className="font-semibold text-base mt-6">Warranty Coverage</h3>
              <ul className="space-y-2">
                <li>
                  <strong>Within warranty:</strong> Your product may be repaired or replaced at no cost.
                </li>
                <li>
                  <strong>Out of warranty:</strong> Repair requests will be automatically rejected. 
                  Please contact sales for paid repair options.
                </li>
                <li>
                  Our repair centers will assess whether to repair or replace based on the damage severity.
                </li>
              </ul>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg mt-4 border border-amber-200 dark:border-amber-900">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">⚠️ Important</p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Warranty does not cover physical damage caused by accidents, misuse, or unauthorized repairs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Warranty Duration</CardTitle>
                <p className="text-sm text-muted-foreground">Coverage period by product</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <ul className="space-y-2">
                <li>
                  Standard warranty periods are <strong>defined per product</strong> in our catalog.
                </li>
                <li>
                  Most products come with a 12-24 month manufacturer's warranty.
                </li>
                <li>
                  Warranty eligibility is based on the <strong>purchase date</strong> and 
                  <strong> product warranty months</strong>.
                </li>
                <li>
                  Extended warranty options may be available at the time of purchase.
                </li>
              </ul>

              <h3 className="font-semibold text-base mt-6">What's Covered</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-900">
                  <p className="font-medium text-sm text-green-900 dark:text-green-100">✓ Covered</p>
                  <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1">
                    <li>• Manufacturing defects</li>
                    <li>• Component failures</li>
                    <li>• Normal wear and tear</li>
                    <li>• Software issues</li>
                  </ul>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900">
                  <p className="font-medium text-sm text-red-900 dark:text-red-100">✗ Not Covered</p>
                  <ul className="text-sm text-red-800 dark:text-red-200 mt-2 space-y-1">
                    <li>• Physical damage</li>
                    <li>• Water damage</li>
                    <li>• Unauthorized modifications</li>
                    <li>• Lost or stolen items</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Times */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Processing Times</CardTitle>
                <p className="text-sm text-muted-foreground">Expected turnaround times</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Return Request Review</span>
                <Badge>1-2 business days</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Refund Processing</span>
                <Badge>5-7 business days</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Repair Assessment</span>
                <Badge>2-3 business days</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Repair Completion</span>
                <Badge>7-14 business days</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Need Help?</h3>
              <p className="text-muted-foreground">
                If you have questions about our policies or need assistance with a ticket, 
                please don't hesitate to contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
