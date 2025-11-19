import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Lock } from "lucide-react";
import { format } from "date-fns";

interface TicketCommentsProps {
  ticketId: string;
}

export function TicketComments({ ticketId }: TicketCommentsProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isStaff = userRole === "STAFF" || userRole === "ADMIN" || userRole === "STAFF_MANAGER";

  useEffect(() => {
    loadComments();
    subscribeToComments();
  }, [ticketId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`ticket-comments-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_comments",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Comment cannot be empty",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ticket_comments").insert({
        ticket_id: ticketId,
        user_id: user?.id,
        comment: newComment.trim(),
        is_internal: isInternal,
      });

      if (error) throw error;

      setNewComment("");
      setIsInternal(false);
      toast({
        title: "Comment posted",
        description: isInternal 
          ? "Internal note added (not visible to customer)" 
          : "Your comment has been added",
      });
    } catch (error) {
      console.error("Error posting comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg border ${
                  comment.is_internal 
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900" 
                    : comment.user_id === user?.id 
                    ? "bg-accent/50" 
                    : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {comment.profiles?.full_name || "Unknown User"}
                      {comment.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                      )}
                    </p>
                    {comment.is_internal && (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">
                        <Lock className="h-3 w-3" />
                        Internal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}

        {/* New Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-4 border-t">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={isInternal ? "Write an internal note (not visible to customer)..." : "Write a comment..."}
            rows={3}
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            {isStaff && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internal"
                  checked={isInternal}
                  onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                />
                <Label
                  htmlFor="internal"
                  className="text-sm font-normal cursor-pointer flex items-center gap-1"
                >
                  <Lock className="h-3 w-3" />
                  Internal note (staff only)
                </Label>
              </div>
            )}
            <Button type="submit" disabled={submitting || !newComment.trim()} className={!isStaff ? "w-full" : ""}>
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Posting..." : isInternal ? "Add Internal Note" : "Post Comment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
