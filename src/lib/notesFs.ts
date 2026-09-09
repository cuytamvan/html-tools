import { forgetFileHandle, persistFileHandle, readFileHandle } from '@/lib/fileHandles';
import { parseNoteFile, serializeNoteFile } from '@/lib/noteFrontmatter';

const IDB_KEY = 'notes-folder';
const CATEGORIES_FILE = 'categories.json';
const WATCH_MS = 5000;

export type NoteCategory = {
  id: string;
  name: string;
  createdAt: number;
};

export type Note = {
  filename: string;
  title: string;
  content: string;
  category: string;
  modifiedAt: number;
};

export type NoteInput = Pick<Note, 'title' | 'content' | 'category'>;

type WatchListener = () => void;

function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file';
}

let dirHandle: FileSystemDirectoryHandle | null = null;
let watchTimer: ReturnType<typeof setInterval> | null = null;
let fsObserver: FileSystemObserver | null = null;
let watchBusy = false;
let lastFolderSignature = '';
const listeners = new Set<WatchListener>();

function notifyChange() {
  for (const listener of listeners) listener();
}

export function onNotesFolderChange(listener: WatchListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasNotesFolder(): boolean {
  return dirHandle != null;
}

export function getNotesFolderLabel(): string {
  return dirHandle?.name ?? '';
}

function stopWatch() {
  if (watchTimer != null) clearInterval(watchTimer);
  watchTimer = null;
  if (fsObserver) {
    try {
      fsObserver.disconnect();
    } catch {
      /* ignore */
    }
    fsObserver = null;
  }
}

function startWatch() {
  if (!dirHandle) return;
  stopWatch();
  watchTimer = setInterval(() => {
    void refreshWatch();
  }, WATCH_MS);
  const Observer = (window as Window & { FileSystemObserver?: typeof FileSystemObserver }).FileSystemObserver;
  if (typeof Observer === 'function') {
    try {
      fsObserver = new Observer(() => {
        void refreshWatch();
      });
      void fsObserver.observe(dirHandle!);
    } catch {
      /* ignore */
    }
  }
}

async function folderSignature(): Promise<string> {
  if (!dirHandle) return '';
  const parts: string[] = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (!isFileHandle(handle)) continue;
    if (!name.toLowerCase().endsWith('.md') && name !== CATEGORIES_FILE) continue;
    const file = await handle.getFile();
    parts.push(`${name}:${file.lastModified}:${file.size}`);
  }
  return parts.sort().join('|');
}

async function refreshWatch(force = false) {
  if (!dirHandle || watchBusy) return;
  watchBusy = true;
  try {
    const signature = await folderSignature();
    if (!force && signature === lastFolderSignature) return;
    lastFolderSignature = signature;
    notifyChange();
  } catch {
    /* ignore read errors during polling */
  } finally {
    watchBusy = false;
  }
}

async function ensureWritePermission(dir: FileSystemDirectoryHandle): Promise<boolean> {
  const current = await dir.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') return true;
  const requested = await dir.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
}

async function readTextFile(name: string): Promise<string> {
  if (!dirHandle) throw new Error('No notes folder selected');
  const handle = await dirHandle.getFileHandle(name);
  const file = await handle.getFile();
  return file.text();
}

async function writeTextFile(name: string, content: string): Promise<void> {
  if (!dirHandle) throw new Error('No notes folder selected');
  const ok = await ensureWritePermission(dirHandle);
  if (!ok) throw new Error('Write permission denied');
  const handle = await dirHandle.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function readCategoriesRaw(): Promise<NoteCategory[]> {
  try {
    const text = await readTextFile(CATEGORIES_FILE);
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is NoteCategory =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.createdAt === 'number',
    );
  } catch (err) {
    const error = err as DOMException;
    if (error?.name === 'NotFoundError') {
      await writeTextFile(CATEGORIES_FILE, '[]\n');
      return [];
    }
    throw err;
  }
}

async function writeCategories(items: NoteCategory[]): Promise<void> {
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
  await writeTextFile(CATEGORIES_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

async function listMarkdownFilenames(): Promise<string[]> {
  if (!dirHandle) return [];
  const names: string[] = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && name.toLowerCase().endsWith('.md')) names.push(name);
  }
  return names.sort((a, b) => a.localeCompare(b));
}

async function readNoteFile(filename: string): Promise<Note> {
  const text = await readTextFile(filename);
  const parsed = parseNoteFile(text);
  let modifiedAt = Date.now();
  try {
    const handle = await dirHandle!.getFileHandle(filename);
    const file = await handle.getFile();
    modifiedAt = file.lastModified;
  } catch {
    /* ignore */
  }
  return {
    filename,
    title: parsed.title,
    content: parsed.content,
    category: parsed.category,
    modifiedAt,
  };
}

function newNoteFilename(): string {
  return `note-${Date.now()}.md`;
}

export async function connectNotesFolder(dir: FileSystemDirectoryHandle): Promise<void> {
  const ok = await ensureWritePermission(dir);
  if (!ok) throw new Error('Write permission denied');
  dirHandle = dir;
  lastFolderSignature = '';
  await persistFileHandle(IDB_KEY, dir, CATEGORIES_FILE);
  await readCategoriesRaw();
  startWatch();
  await refreshWatch(true);
}

export async function restoreNotesFolder(): Promise<boolean> {
  try {
    const record = await readFileHandle(IDB_KEY);
    const dir =
      record && record.version === 2
        ? (record.dir as FileSystemDirectoryHandle | undefined)
        : record && record.kind === 'directory'
          ? (record as FileSystemDirectoryHandle)
          : null;
    if (!dir || typeof dir.queryPermission !== 'function') return false;
    const ok = await ensureWritePermission(dir);
    if (!ok) return false;
    dirHandle = dir;
    lastFolderSignature = '';
    await readCategoriesRaw();
    startWatch();
    await refreshWatch(true);
    return true;
  } catch {
    return false;
  }
}

export async function clearNotesFolder(): Promise<void> {
  stopWatch();
  dirHandle = null;
  lastFolderSignature = '';
  await forgetFileHandle(IDB_KEY);
}

export async function pickNotesFolder(): Promise<void> {
  const picker = window.showDirectoryPicker;
  if (!picker) throw new Error('Folder picker is not supported in this browser');
  const dir = await picker({ mode: 'readwrite' });
  await connectNotesFolder(dir);
}

export function listCategories(): Promise<NoteCategory[]> {
  return readCategoriesRaw().then((items) => [...items].sort((a, b) => b.createdAt - a.createdAt));
}

export async function createCategory(name: string): Promise<NoteCategory> {
  const items = await readCategoriesRaw();
  const item: NoteCategory = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: Date.now(),
  };
  items.push(item);
  await writeCategories(items);
  notifyChange();
  return item;
}

export async function updateCategory(id: string, name: string): Promise<NoteCategory> {
  const items = await readCategoriesRaw();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error('Category not found');
  const next = { ...items[index], name: name.trim() };
  items[index] = next;
  await writeCategories(items);
  notifyChange();
  return next;
}

export async function deleteCategory(id: string): Promise<void> {
  const items = await readCategoriesRaw();
  await writeCategories(items.filter((item) => item.id !== id));
  const notes = await listNotes();
  await Promise.all(
    notes
      .filter((note) => note.category === id)
      .map((note) =>
        updateNote(note.filename, {
          title: note.title,
          content: note.content,
          category: '',
        }),
      ),
  );
  notifyChange();
}

export async function listNotes(): Promise<Note[]> {
  const filenames = await listMarkdownFilenames();
  const notes = await Promise.all(filenames.map((filename) => readNoteFile(filename)));
  return notes.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

export async function getNote(filename: string): Promise<Note | undefined> {
  try {
    return await readNoteFile(filename);
  } catch (err) {
    const error = err as DOMException;
    if (error?.name === 'NotFoundError') return undefined;
    throw err;
  }
}

export async function createNote(input: Partial<NoteInput> = {}): Promise<Note> {
  const filename = newNoteFilename();
  const note: Note = {
    filename,
    title: input.title?.trim() ?? '',
    content: input.content ?? '',
    category: input.category ?? '',
    modifiedAt: Date.now(),
  };
  await writeTextFile(
    filename,
    serializeNoteFile({
      title: note.title,
      category: note.category,
      content: note.content,
    }),
  );
  notifyChange();
  return note;
}

export async function updateNote(filename: string, input: NoteInput): Promise<Note> {
  const existing = await getNote(filename);
  if (!existing) throw new Error('Note not found');
  const next: Note = {
    ...existing,
    title: input.title.trim(),
    content: input.content,
    category: input.category,
    modifiedAt: Date.now(),
  };
  await writeTextFile(
    filename,
    serializeNoteFile({
      title: next.title,
      category: next.category,
      content: next.content,
    }),
  );
  notifyChange();
  return next;
}

export async function deleteNote(filename: string): Promise<void> {
  if (!dirHandle) throw new Error('No notes folder selected');
  const ok = await ensureWritePermission(dirHandle);
  if (!ok) throw new Error('Write permission denied');
  await dirHandle.removeEntry(filename);
  notifyChange();
}
