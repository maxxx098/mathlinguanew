import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, easeInOut } from "framer-motion";
import { MessageCircle, Heart, Plus, Send, ArrowLeft, Trash2, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import GuestGate from "@/components/GuestGate";

interface Post {
  id: string; user_id: string; title: string; content: string; created_at: string;
  display_name: string; heart_count: number; reply_count: number; user_hearted: boolean;
}
interface Reply { id: string; user_id: string; content: string; created_at: string; display_name: string; }
interface SearchResult { user_id: string; display_name: string | null; avatar_url: string | null; }

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.04, ease: easeInOut },
});

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url").ilike("display_name", `%${searchQuery.trim()}%`).limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPosts = async () => {
    const { data: postsData } = await supabase.from("community_posts").select("*").order("created_at", { ascending: false });
    if (!postsData) { setLoading(false); return; }
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const postIds = postsData.map(p => p.id);
    const [profilesRes, heartsRes, repliesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name").in("user_id", userIds),
      postIds.length > 0 ? supabase.from("community_post_hearts").select("post_id, user_id").in("post_id", postIds) : { data: [] },
      postIds.length > 0 ? supabase.from("community_post_replies").select("post_id").in("post_id", postIds) : { data: [] },
    ]);
    const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.display_name]));
    const hearts = heartsRes.data || [];
    const replyData = repliesRes.data || [];
    setPosts(postsData.map(p => ({
      ...p,
      display_name: profileMap[p.user_id] || "Unknown",
      heart_count: hearts.filter(h => h.post_id === p.id).length,
      reply_count: replyData.filter(r => r.post_id === p.id).length,
      user_hearted: hearts.some(h => h.post_id === p.id && h.user_id === user?.id),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [user]);

  const handleCreate = async () => {
    if (!user || !newTitle.trim() || !newContent.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("community_posts").insert({ user_id: user.id, title: newTitle.trim(), content: newContent.trim() });
    setCreating(false);
    if (error) { toast.error("Failed to create post"); return; }
    toast.success("Post created!");
    setNewTitle(""); setNewContent(""); setShowCreate(false);
    fetchPosts();
  };

  const handleHeart = async (post: Post) => {
    if (!user) return;
    if (post.user_hearted) {
      await supabase.from("community_post_hearts").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("community_post_hearts").insert({ post_id: post.id, user_id: user.id });
    }
    fetchPosts();
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from("community_posts").delete().eq("id", postId);
    toast.success("Post deleted");
    setSelectedPost(null);
    fetchPosts();
  };

  const openReplies = async (post: Post) => {
    setSelectedPost(post);
    const { data } = await supabase.from("community_post_replies").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const map = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
      setReplies(data.map(r => ({ ...r, display_name: map[r.user_id] || "Unknown" })));
    } else {
      setReplies([]);
    }
  };

  const handleReply = async () => {
    if (!user || !selectedPost || !replyText.trim()) return;
    await supabase.from("community_post_replies").insert({ post_id: selectedPost.id, user_id: user.id, content: replyText.trim() });
    setReplyText("");
    openReplies(selectedPost);
    fetchPosts();
  };

  const Avatar = ({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) => (
    <div className={`${size === "md" ? "h-10 w-10 text-sm" : "h-7 w-7 text-[11px]"} rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-medium text-primary`}>
      {initials(name)}
    </div>
  );

  const NameLink = ({ userId: uid, name }: { userId: string; name: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/student/${uid}`); }}
      className="text-xs font-semibold hover:underline underline-offset-2"
    >
      {name}
    </button>
  );

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (selectedPost) {
    return (
      <div className="pb-28 min-h-screen">
        {/* Back header */}
        <div className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-border/50">
          <button onClick={() => setSelectedPost(null)} className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium truncate">{selectedPost.title}</span>
        </div>

        <div className="px-4 pt-5 space-y-6">
          {/* Original post */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar name={selectedPost.display_name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <NameLink userId={selectedPost.user_id} name={selectedPost.display_name} />
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(selectedPost.created_at)}</span>
                </div>
                <h2 className="text-base font-semibold mt-1 leading-snug">{selectedPost.title}</h2>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{selectedPost.content}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 pl-[52px]">
              <GuestGate>
                {(gate) => (
                  <button
                    onClick={() => { if (gate()) handleHeart(selectedPost); }}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${selectedPost.user_hearted ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${selectedPost.user_hearted ? "fill-current" : ""}`} strokeWidth={1.75} />
                    {selectedPost.heart_count}
                  </button>
                )}
              </GuestGate>
              {selectedPost.user_id === user?.id && (
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Replies */}
          <div className="space-y-5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
            </p>

            {replies.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No replies yet. Start the conversation.</p>
            )}

            {replies.map((r, i) => (
              <motion.div key={r.id} {...stagger(i)} className="flex items-start gap-3">
                <Avatar name={r.display_name} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <NameLink userId={r.user_id} name={r.display_name} />
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{r.content}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Reply input */}
          <GuestGate>
            {(gate) => (
              <div className="flex items-end gap-2 pt-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => gate()}
                  placeholder="Write a reply…"
                  rows={2}
                  className="resize-none text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (gate()) handleReply(); } }}
                />
                <Button size="icon" className="shrink-0" onClick={() => { if (gate()) handleReply(); }} disabled={!replyText.trim()}>
                  <Send className="h-4 w-4" strokeWidth={1.75} />
                </Button>
              </div>
            )}
          </GuestGate>
        </div>
      </div>
    );
  }

  // ── Create post ──────────────────────────────────────────────────────────────
  if (showCreate) {
    return (
      <div className="pb-28 min-h-screen">
        <div className="flex items-center gap-2 px-4 pt-5 pb-4 border-b border-border/50">
          <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium">New post</span>
        </div>

        <div className="px-4 pt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Title</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What's this about?"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Content</label>
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Share your thoughts, questions, or tips…"
              className="min-h-[140px] resize-none text-sm"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={creating || !newTitle.trim() || !newContent.trim()}
          >
            {creating ? "Posting…" : "Publish"}
          </Button>
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-28 min-h-screen">
      {/* Header */}
      <motion.div {...stagger(0)} className="px-4 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Community</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Learn together</p>
          </div>
          <GuestGate>
            {(gate) => (
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => { if (gate()) setShowCreate(true); }}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} /> New post
              </Button>
            )}
          </GuestGate>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search learners…"
            className="pl-8 text-sm h-9"
          />
          {searchQuery.trim() && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-popover shadow-md overflow-hidden">
              {searching ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">No learners found</div>
              ) : searchResults.map((r) => (
                <button
                  key={r.user_id}
                  onClick={() => { setSearchQuery(""); navigate(`/student/${r.user_id}`); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                  </div>
                  <span className="text-sm">{r.display_name || "Learner"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Feed */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No posts yet. Be the first to share something.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                {...stagger(i)}
                className="py-4 cursor-pointer"
                onClick={() => openReplies(post)}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={post.display_name} />
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <NameLink userId={post.user_id} name={post.display_name} />
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(post.created_at)}</span>
                    </div>
                    {/* Title */}
                    <p className="text-sm font-semibold leading-snug">{post.title}</p>
                    {/* Preview */}
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{post.content}</p>
                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-2.5">
                      <GuestGate>
                        {(gate) => (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (gate()) handleHeart(post); }}
                            className={`flex items-center gap-1.5 text-xs transition-colors ${post.user_hearted ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${post.user_hearted ? "fill-current" : ""}`} strokeWidth={1.75} />
                            {post.heart_count}
                          </button>
                        )}
                      </GuestGate>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {post.reply_count}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;