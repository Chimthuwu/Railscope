import { useState, useEffect, useRef } from "react";
import { auth, db } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, runTransaction, getDoc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { Image as ImageIcon, Send, Loader2, LogIn, LogOut, Heart, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";

export function Feed() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        signInAnonymously(auth).catch(console.error);
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(p);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Feed Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImage(file);
      setImageUrl(base64);
    } catch (error) {
      console.error("Failed to resize image", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && !imageUrl) || !user) return;
    
    setIsSubmitting(true);
    try {
      const postData: any = {
        text: newPost.trim() || "Shared an image",
        authorId: user.uid,
        authorName: user.isAnonymous || isAnonymous ? "Anonymous" : (user.displayName || "Anonymous"),
        createdAt: serverTimestamp(),
        likesCount: 0,
      };
      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }
      
      await addDoc(collection(db, "posts"), postData);
      setNewPost("");
      setImageUrl(null);
    } catch (error) {
      console.error("Failed to post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const handleAdminTap = () => {
    setAdminTapCount(prev => {
      const next = prev + 1;
      if (next >= 7) {
        if (user?.email === 'chimske@gmail.com') {
          setShowAdmin(true);
        }
        return 0;
      }
      return next;
    });
  };

  const handleClearFeed = async () => {
    if (user?.email !== 'chimske@gmail.com') return;
    if (!window.confirm("WARNING: This will delete ALL posts in the feed. Are you sure?")) return;
    try {
      const batch = writeBatch(db);
      posts.forEach(post => {
        batch.delete(doc(db, "posts", post.id));
      });
      await batch.commit();
      setShowAdmin(false);
    } catch (error) {
      console.error("Failed to clear feed:", error);
    }
  };

  const handleLike = async (post: any) => {
    if (!user) return;
    try {
      const postRef = doc(db, "posts", post.id);
      const likeRef = doc(db, `posts/${post.id}/likes`, user.uid);
      
      await runTransaction(db, async (transaction) => {
        const likeDoc = await transaction.get(likeRef);
        const pDoc = await transaction.get(postRef);
        
        if (!pDoc.exists()) throw new Error("Document does not exist!");
        
        const newCount = (pDoc.data().likesCount || 0) + (likeDoc.exists() ? -1 : 1);
        
        transaction.update(postRef, { likesCount: newCount });
        if (likeDoc.exists()) {
          transaction.delete(likeRef);
        } else {
          transaction.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        }
      });
    } catch (error) {
      console.error("Failed to like:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black overflow-hidden relative">
      <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-md shrink-0 select-none">
        <h2 onClick={handleAdminTap} className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200 cursor-default">Network Feed</h2>
        {user && !user.isAnonymous ? (
          <button onClick={handleLogout} className="text-sm font-semibold flex items-center gap-1.5 text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="avatar" className="w-6 h-6 rounded-full" />
            <LogOut size={14} />
          </button>
        ) : (
          <button onClick={handleLogin} className="text-sm font-bold flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-full transition-colors">
            <LogIn size={14} />
            Sign In
          </button>
        )}
      </div>

      {showAdmin && user?.email === 'chimske@gmail.com' && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20 shrink-0 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
            <Trash2 size={16} />
            Admin Mode Active
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleClearFeed}
              className="text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              Clear Feed
            </button>
            <button 
              onClick={() => setShowAdmin(false)}
              className="text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {user && (
        <div className="p-4 border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#111] shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <img src={!user.isAnonymous && user.photoURL ? user.photoURL : `https://ui-avatars.com/api/?name=Anonymous`} alt="avatar" className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder={!user.isAnonymous ? "Share a network delay, tip, or photo..." : "Share a network delay or tip..."}
                  className="w-full bg-slate-100 dark:bg-white/5 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 ring-blue-500/50 text-slate-800 dark:text-slate-200 resize-none"
                  rows={2}
                />
              </div>
            </div>
            {imageUrl && (
              <div className="ml-13 relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-[200px]">
                <button 
                  type="button" 
                  onClick={() => setImageUrl(null)} 
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center p-1"
                >&times;</button>
                <img src={imageUrl} alt="upload preview" className="w-full h-auto" />
              </div>
            )}
            <div className="flex justify-between items-center ml-13">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!user.isAnonymous) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`p-2 rounded-full transition-colors ${user.isAnonymous ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}
                  title={user.isAnonymous ? "Sign in to add pictures" : "Add Image"}
                >
                  <ImageIcon size={18} />
                  {!user.isAnonymous && (
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  )}
                </button>
                {!user.isAnonymous ? (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border border-black/20 dark:border-white/20 flex items-center justify-center transition-colors ${isAnonymous ? 'bg-blue-500 border-blue-500' : 'bg-transparent group-hover:border-blue-500/50'}`}>
                      {isAnonymous && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="hidden"
                    />
                    <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200 transition-colors">Hide name</span>
                  </label>
                ) : (
                  <span className="text-[10px] sm:text-xs text-slate-400 font-medium whitespace-nowrap">Posting anonymously</span>
                )}
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || (!newPost.trim() && !imageUrl)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-1.5 px-4 rounded-full text-sm transition-colors shrink-0"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Post
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-4">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center p-10 text-slate-500">No posts yet. Be the first to share an update!</div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:border-blue-500/20 transition-colors">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 uppercase font-bold text-slate-500 text-sm overflow-hidden">
                   {post.authorName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{post.authorName}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                       {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                    </span>
                  </div>
                  {post.text && <p className="text-slate-700 dark:text-slate-300 text-sm mb-3 whitespace-pre-wrap">{post.text}</p>}
                  {post.imageUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-black/5 dark:border-white/5">
                      <img src={post.imageUrl} alt="Post attachment" className="w-full h-auto max-h-[300px] object-cover" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(post)}
                        className={`flex items-center gap-1.5 text-xs font-semibold ${user ? 'hover:text-pink-500' : 'opacity-50'} transition-colors ${post.likesCount > 0 ? 'text-pink-500' : 'text-slate-400'}`}
                        title={user ? "Like" : "Sign in to like"}
                      >
                        <Heart size={16} className={post.likesCount > 0 ? "fill-current" : ""} />
                        {post.likesCount || 0}
                      </button>
                    </div>
                    {user && (user.uid === post.authorId || user.email === 'chimske@gmail.com') && (
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Delete post"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
