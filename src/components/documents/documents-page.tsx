import { useState, useMemo, useEffect, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { supabaseUntyped as db } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  FileText,
  Download,
  Loader2,
  Trash2,
  ShieldCheck,
  Landmark,
  Calendar,
  HardDrive,
  FileQuestion,
  FileBox,
  AlertCircle
} from "lucide-react"

// Updated Interface to match Database snake_case naming
interface Document {
  id: string
  name: string
  category: "governance" | "finance" | "events" | "other"
  file_type: string 
  size: string
  uploaded_at: string
  uploaded_by: string
  storage_path: string
}

export function DocumentsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFilter = searchParams.get("category") || "all"
  const [searchQuery, setSearchQuery] = useState("")
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState<Document["category"]>("other")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await db
        .from("documents")
        .select("*")
        .order("uploaded_at", { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error("Error fetching documents:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const setCategoryFilter = (val: string) => {
    setSearchParams({ category: val })
  }

  const handleAdd = async () => {
    if (!selectedFile || !user) return
    setIsUploading(true)
    setUploadError(null)

    try {
      const fileExt = selectedFile.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      // Uploading to "documents" bucket
      const { error: storageError } = await db.storage
        .from("documents") 
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (storageError) throw new Error(`Storage Error: ${storageError.message}`)

      // FINAL FIX: All keys converted to snake_case to match DB schema
      const newDoc = {
        name: formName || selectedFile.name,
        category: formCategory,
        file_type: selectedFile.type, 
        size: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
        uploaded_by: user.email, // Fixed from uploadedBy
        storage_path: filePath,  // Fixed from storagePath
        uploaded_at: new Date().toISOString() // Fixed from uploadedAt
      }

      const { error: dbError } = await db
        .from("documents")
        .insert(newDoc)

      if (dbError) throw new Error(`Database Error: ${dbError.message}`)

      setAddOpen(false)
      setSelectedFile(null)
      setFormName("")
      fetchDocuments()
    } catch (err: any) {
      setUploadError(err.message)
      console.error("Upload failed:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Are you sure you want to remove this document?")) return
    try {
      await db.storage.from("documents").remove([path])
      await db.from("documents").delete().eq("id", id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  const handleDownload = async (path: string, filename: string) => {
    try {
      const { data, error } = await db.storage.from("documents").download(path)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
    } catch (err) {
      console.error("Download failed:", err)
    }
  }

  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [documents, categoryFilter, searchQuery])

  const getIcon = (cat: string) => {
    switch (cat) {
      case "governance": return <ShieldCheck className="h-5 w-5 text-blue-500" />
      case "finance": return <Landmark className="h-5 w-5 text-emerald-500" />
      case "events": return <Calendar className="h-5 w-5 text-amber-500" />
      default: return <FileText className="h-5 w-5 text-slate-400" />
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Resource Vault</h1>
          <p className="text-muted-foreground text-sm font-medium">Secure document storage and organization.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Upload
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/50 p-2 rounded-2xl border backdrop-blur-sm">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full sm:w-auto">
          <TabsList className="bg-transparent gap-1">
            {["all", "governance", "finance", "events", "other"].map(tab => (
              <TabsTrigger 
                key={tab}
                value={tab} 
                className="capitalize font-bold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-4"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64 px-2">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search vault..." 
            className="pl-9 bg-background/50 border-none ring-1 ring-border focus-visible:ring-primary rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="animate-spin h-10 w-10 mb-4 opacity-20 text-primary" />
          <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Syncing Vault...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-32 text-center border border-dashed rounded-[2rem] bg-muted/5 border-border/60">
          <FileQuestion className="h-16 w-16 mx-auto opacity-10 mb-4" />
          <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest">No matching assets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((doc) => (
            <div key={doc.id} className="group relative bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 transition-all shadow-sm hover:shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                  {getIcon(doc.category)}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                  {doc.file_type?.split('/')?.[1] || 'FILE'}
                </span>
              </div>
              <h3 className="font-bold truncate mb-1 text-foreground" title={doc.name}>{doc.name}</h3>
              <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground gap-2">
                <span>{doc.size}</span>
                <span className="opacity-30">•</span>
                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
              </div>
              
              <div className="flex gap-2 mt-5">
                <Button variant="secondary" size="sm" className="flex-1 rounded-xl font-bold text-xs" onClick={() => handleDownload(doc.storage_path, doc.name)}>
                  <Download className="h-3.5 w-3.5 mr-2" /> Download
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(doc.id, doc.storage_path)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2.5rem] p-8 border-none shadow-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileBox className="h-6 w-6 text-primary" />
              </div>
              Upload
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {uploadError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-2 border border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            <div className="border-2 border-dashed border-border/60 rounded-3xl p-10 text-center relative hover:bg-muted/30 transition-all cursor-pointer group hover:border-primary/40">
              <label className="cursor-pointer block">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setSelectedFile(file)
                    if (file) setFormName(file.name)
                  }} 
                />
                <HardDrive className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary transition-all mb-3 group-hover:scale-110" />
                <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">
                  {selectedFile ? selectedFile.name : "Select Asset"}
                </p>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asset Name</label>
              <Input 
                placeholder="e.g. Q1 Finance Report" 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl border-border/60 h-11 font-medium focus-visible:ring-primary shadow-none bg-muted/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classification</label>
              <div className="grid grid-cols-2 gap-2">
                {["governance", "finance", "events", "other"].map((cat) => (
                  <Button
                    key={cat}
                    variant={formCategory === cat ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "capitalize rounded-xl font-bold h-10 transition-all",
                      formCategory === cat ? "shadow-lg shadow-primary/20" : "border-border/60"
                    )}
                    onClick={() => setFormCategory(cat as any)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleAdd} disabled={isUploading || !selectedFile} className="w-full rounded-2xl h-14 text-md font-black shadow-xl shadow-primary/20">
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Encrypting...
                </>
              ) : "Upload to documents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}