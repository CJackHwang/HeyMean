/**
 * Example Tests for Notes Tools
 * These are example tests showing how the notes tools should work
 * To run actual tests, you would need to set up a test framework
 */

import { 
  createNoteExecutor, 
  readNoteExecutor, 
  listNotesExecutor, 
  updateNoteExecutor 
} from '../notes/executors';
import { createToolContext } from '../registry';

/**
 * Mock implementation examples
 * In a real test environment, you would use actual test utilities
 */

// Example 1: Test createNote
async function testCreateNote() {
  const context = createToolContext();
  const result = await createNoteExecutor(
    { title: 'Test Note', content: 'Test content' },
    context
  );
  
  console.log('Create Note Result:', result);
  // Expected: { success: true, data: { id: ..., title: 'Test Note', ... } }
}

// Example 2: Test readNote with invalid ID
async function testReadNoteNotFound() {
  const context = createToolContext();
  const result = await readNoteExecutor(
    { id: 999999 },
    context
  );
  
  console.log('Read Note (Not Found) Result:', result);
  // Expected: { success: false, error: 'Note with ID 999999 not found' }
}

// Example 3: Test listNotes
async function testListNotes() {
  const context = createToolContext();
  const result = await listNotesExecutor(
    { limit: 10 },
    context
  );
  
  console.log('List Notes Result:', result);
  // Expected: { success: true, data: { notes: [...], total: ..., returned: ... } }
}

// Example 4: Test updateNote
async function testUpdateNote() {
  const context = createToolContext();
  
  // First create a note
  const createResult = await createNoteExecutor(
    { title: 'Original Title', content: 'Original content' },
    context
  );
  
  if (!createResult.success) {
    console.error('Failed to create note for test');
    return;
  }
  
  const noteId = createResult.data.id;
  
  // Then update it
  const updateResult = await updateNoteExecutor(
    { id: noteId, title: 'Updated Title' },
    context
  );
  
  console.log('Update Note Result:', updateResult);
  // Expected: { success: true, data: { id: noteId, title: 'Updated Title', ... } }
}

// Example 5: Test validation errors
async function testValidationErrors() {
  const context = createToolContext();
  
  // Test missing required parameter
  const result1 = await createNoteExecutor(
    { content: 'No title' } as any,
    context
  );
  console.log('Validation Error (missing title):', result1);
  // Expected: { success: false, error: 'Title is required...' }
  
  // Test invalid type
  const result2 = await readNoteExecutor(
    { id: 'not-a-number' } as any,
    context
  );
  console.log('Validation Error (invalid type):', result2);
  // Expected: { success: false, error: 'Note ID must be a number' }
}

// Example 6: Test tool registry
import { defaultToolRegistry } from '../registry';

async function testToolRegistry() {
  const context = createToolContext();
  
  // Check if tools are registered
  console.log('Registered tools count:', defaultToolRegistry.size);
  console.log('Has createNote:', defaultToolRegistry.has('createNote'));
  console.log('Has readNote:', defaultToolRegistry.has('readNote'));
  
  // Execute via registry
  const result = await defaultToolRegistry.execute(
    'listNotes',
    { limit: 5 },
    context
  );
  
  console.log('Registry Execute Result:', result);
}

// Run examples
export async function runExamples() {
  console.log('=== Notes Tool Examples ===\n');
  
  await testCreateNote();
  await testReadNoteNotFound();
  await testListNotes();
  await testUpdateNote();
  await testValidationErrors();
  await testToolRegistry();
  
  console.log('\n=== Examples Complete ===');
}

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as any).runNotesToolExamples = runExamples;
  console.log('Run examples in console: window.runNotesToolExamples()');
}
