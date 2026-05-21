import { describe, it, expect } from "vitest"
import { supabase } from "../../src/lib/supabase"

/**
 * ITR3 Integration Test: Production-Grade Persistence & Module Seams
 */
describe("Cross-Module Database Integration", () => {
  
  // FIXED: Explicitly typed to match your Supabase schema
  const coreModules: Array<"members" | "tasks" | "events" | "sponsors"> = [
    "members", 
    "tasks", 
    "events", 
    "sponsors" // Assuming 'sponsors' is your contacts table based on your schema
  ];

  it("should verify read access and schema integrity for all core modules", async () => {
    for (const table of coreModules) {
      const { data, error } = await supabase.from(table).select("*").limit(1);
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  it("should successfully execute a full Create-Read-Delete cycle on the Tasks module", async () => {
    const uniqueTitle = `ITR3-Integration-Test-${Date.now()}`;
    
    // 1. CREATE
    const { data: insertData, error: insertError } = await supabase
      .from("tasks")
      .insert([{ title: uniqueTitle, status: "To-Do", priority: "High" }])
      .select()
      .single();

    expect(insertError).toBeNull();
    // FIXED: Use non-null assertion (!) after checking error is null
    expect(insertData!.title).toBe(uniqueTitle);
    const taskId = insertData!.id;

    // 2. READ
    const { data: fetchData, error: fetchError } = await supabase
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .single();

    expect(fetchError).toBeNull();
    expect(fetchData!.title).toBe(uniqueTitle);

    // 3. DELETE
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    expect(deleteError).toBeNull();
  });

  it("should handle non-existent ID queries gracefully", async () => {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";
    const { data, error } = await supabase.from("members").select("*").eq("id", fakeUuid).single();

    expect(data).toBeNull();
    if (error) expect(error.code).toBe("PGRST116");
  });
});