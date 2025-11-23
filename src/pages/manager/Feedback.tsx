import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Star, MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FeedbackData {
  id: string;
  ticket_id: string;
  rating: number;
  comments: string | null;
  created_at: string;
  tickets: {
    ticket_number: number;
    customer_name: string;
    status: string;
    products: {
      name: string;
    };
  };
}

export default function Feedback() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  useEffect(() => {
    // Check authorization
    if (userRole !== "STAFF_MANAGER" && userRole !== "ADMIN") {
      navigate("/dashboard");
      return;
    }
    loadFeedback();
  }, [userRole]);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_feedback")
        .select(
          `
          *,
          tickets (
            ticket_number,
            customer_name,
            status,
            products (name)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFeedback(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error loading feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: FeedbackData[]) => {
    if (data.length === 0) {
      setStats({ total: 0, averageRating: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      return;
    }

    const total = data.length;
    const sum = data.reduce((acc, item) => acc + item.rating, 0);
    const averageRating = sum / total;

    const ratingDistribution = data.reduce(
      (acc, item) => {
        acc[item.rating as keyof typeof acc]++;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );

    setStats({ total, averageRating, ratingDistribution });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
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
        <div>
          <h1 className="text-3xl font-bold">Customer Feedback</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze customer satisfaction ratings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</div>
                {renderStars(Math.round(stats.averageRating))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{rating}★</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${
                            stats.total > 0
                              ? (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] /
                                  stats.total) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right">
                      {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No feedback submitted yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium">#{item.tickets.ticket_number}</span>
                      </TableCell>
                      <TableCell>{item.tickets.customer_name}</TableCell>
                      <TableCell>{item.tickets.products?.name || "N/A"}</TableCell>
                      <TableCell>{renderStars(item.rating)}</TableCell>
                      <TableCell className="max-w-md">
                        {item.comments ? (
                          <p className="text-sm text-muted-foreground truncate">{item.comments}</p>
                        ) : (
                          <span className="text-muted-foreground italic">No comments</span>
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(item.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/tickets/${item.ticket_id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
