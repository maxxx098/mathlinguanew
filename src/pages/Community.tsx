import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, Heart, Plus, Send, ArrowLeft, Trash2, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

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
      ...p, display_name: profileMap[p.user_id] || "Unknown",
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
    toast.success("Post deleted"); setSelectedPost(null); fetchPosts();
  };

  const openReplies = async (post: Post) => {
    setSelectedPost(post);
    const { data } = await supabase.from("community_post_replies").select("*").eq("post_id", post.id).order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const map = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]));
      setReplies(data.map(r => ({ ...r, display_name: map[r.user_id] || "Unknown" })));
    } else { setReplies([]); }
  };

  const handleReply = async () => {
    if (!user || !selectedPost || !replyText.trim()) return;
    await supabase.from("community_post_replies").insert({ post_id: selectedPost.id, user_id: user.id, content: replyText.trim() });
    setReplyText(""); openReplies(selectedPost); fetchPosts();
  };

  const NameLink = ({ userId: uid, name }: { userId: string; name: string }) => (
    <button onClick={(e) => { e.stopPropagation(); navigate(`/student/${uid}`); }} className="text-xs font-semibold text-primary hover:underline">{name}</button>
  );

  // Detail view
  if (selectedPost) {
    return (
      <div className="pb-24 pt-4 px-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedPost(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-bold truncate">{selectedPost.title}</h1>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <NameLink userId={selectedPost.user_id} name={selectedPost.display_name} />
              <Badge variant="secondary" className="text-[10px]">{timeAgo(selectedPost.created_at)}</Badge>
            </div>
            <p className="text-sm leading-relaxed">{selectedPost.content}</p>
            <div className="flex items-center gap-4 pt-1">
              <GuestGate>
                {(gate) => (
                  <button onClick={() => { if (gate()) handleHeart(selectedPost); }}
                    className={`flex items-center gap-1 text-xs transition-colors ${selectedPost.user_hearted ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                    <Heart className={`h-3.5 w-3.5 ${selectedPost.user_hearted ? "fill-current" : ""}`} /> {selectedPost.heart_count}
                  </button>
                )}
              </GuestGate>
              {selectedPost.user_id === user?.id && (
                <button onClick={() => handleDeletePost(selectedPost.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <h2 className="font-display text-sm font-bold">Replies ({replies.length})</h2>
        <div className="space-y-2">
          {replies.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No replies yet. Be the first!</p>}
          {replies.map(r => (
            <Card key={r.id}>
              <CardContent className="py-3 px-4 space-y-1">
                <div className="flex items-center justify-between">
                  <NameLink userId={r.user_id} name={r.display_name} />
                  <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-xs">{r.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <GuestGate>
          {(gate) => (
            <div className="flex gap-2">
              <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..."
                onFocus={() => gate()}
                onKeyDown={(e) => { if (e.key === "Enter" && gate()) handleReply(); }} />
              <Button size="icon" onClick={() => { if (gate()) handleReply(); }} disabled={!replyText.trim()}><Send className="h-4 w-4" /></Button>
            </div>
          )}
        </GuestGate>
      </div>
    );
  }

  // Create post
  if (showCreate) {
    return (
      <div className="pb-24 pt-4 px-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl font-bold">New Post</h1>
        </div>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Post title" />
            <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="What's on your mind?" className="min-h-[120px]" />
            <Button className="w-full" onClick={handleCreate} disabled={creating || !newTitle.trim() || !newContent.trim()}>
              {creating ? "Posting..." : "Post"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="pb-24 pt-4 px-4 space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Community</h1>
            <p className="text-sm text-muted-foreground">Learn together, grow together</p>
          </div>
          <GuestGate>
            {(gate) => (
              <Button size="sm" className="gap-1" onClick={() => { if (gate()) setShowCreate(true); }}>
                <Plus className="h-4 w-4" /> Post
              </Button>
            )}
          </GuestGate>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-9" />
          {(searchResults.length > 0 || searching) && searchQuery.trim() && (
            <Card className="absolute z-20 mt-1 w-full overflow-hidden">
              <CardContent className="p-0">
                {searching ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">Searching...</div>
                ) : (
                  searchResults.map(r => (
                    <button key={r.user_id} onClick={() => { setSearchQuery(""); navigate(`/student/${r.user_id}`); }}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4 w-4" /></div>
                      <span className="text-sm font-medium">{r.display_name || "Learner"}</span>
                    </button>
                  ))
                )}
                {!searching && searchResults.length === 0 && <div className="p-3 text-xs text-muted-foreground text-center">No users found</div>}
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
      ) : posts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No posts yet. Be the first to share something!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openReplies(post)}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <NameLink userId={post.user_id} name={post.display_name} />
                    <Badge variant="secondary" className="text-[10px]">{timeAgo(post.created_at)}</Badge>
                  </div>
                  <p className="font-display text-sm font-bold">{post.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 pt-1">
                    <GuestGate>
                      {(gate) => (
                        <button onClick={(e) => { e.stopPropagation(); if (gate()) handleHeart(post); }}
                          className={`flex items-center gap-1 text-xs transition-colors ${post.user_hearted ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}>
                          <Heart className={`h-3.5 w-3.5 ${post.user_hearted ? "fill-current" : ""}`} /> {post.heart_count}
                        </button>
                      )}
                    </GuestGate>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-3.5 w-3.5" /> {post.reply_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Community;
