
// Represents the type of a filesystem node
export enum FileSystemNodeType {
  FILE = 'FILE',
  DIRECTORY = 'DIRECTORY'
}

// Base interface for filesystem nodes
export interface FileSystemNode {
  name: string;
  type: FileSystemNodeType;
  parent: DirectoryNode | null;
  path: string; // Full path to this node
  createdAt: Date;
}

// File node with content
export interface FileNode extends FileSystemNode {
  type: FileSystemNodeType.FILE;
  content: string;
}

// Directory node with children
export interface DirectoryNode extends FileSystemNode {
  type: FileSystemNodeType.DIRECTORY;
  children: Map<string, FileSystemNode>;
}

// Create a new file node
export function createFileNode(
  name: string, 
  parent: DirectoryNode | null, 
  content: string = ''
): FileNode {
  const parentPath = parent ? parent.path : '';
  const path = `${parentPath}/${name}`.replace(/\/+/g, '/');
  
  return {
    name,
    type: FileSystemNodeType.FILE,
    parent,
    path,
    content,
    createdAt: new Date()
  };
}

// Create a new directory node
export function createDirectoryNode(
  name: string, 
  parent: DirectoryNode | null
): DirectoryNode {
  const parentPath = parent ? parent.path : '';
  const path = `${parentPath}/${name}`.replace(/\/+/g, '/');
  if (path === '') return ROOT_DIRECTORY; // Special case for root
  
  return {
    name,
    type: FileSystemNodeType.DIRECTORY,
    parent,
    path,
    children: new Map<string, FileSystemNode>(),
    createdAt: new Date()
  };
}

// Create the root directory
export const ROOT_DIRECTORY: DirectoryNode = {
  name: '',
  type: FileSystemNodeType.DIRECTORY,
  parent: null,
  path: '/',
  children: new Map<string, FileSystemNode>(),
  createdAt: new Date()
};

export class FileSystem {
  root: DirectoryNode;
  name: string;
  fsType: string;

  constructor(name: string = 'default', fsType: string = 'ext4') {
    this.root = {
      ...ROOT_DIRECTORY,
      children: new Map<string, FileSystemNode>()
    };
    this.name = name;
    this.fsType = fsType;
  }

  // Normalize path (handle . and .. and ensure starting /)
  normalizePath(path: string, currentDir: string = '/'): string {
    // Handle empty path
    if (!path) return '/';
    
    // Handle relative paths
    let fullPath = path;
    if (!path.startsWith('/')) {
      fullPath = `${currentDir}/${path}`;
    }

    // Split the path into segments
    const segments = fullPath.split('/').filter(seg => seg !== '');
    const result: string[] = [];

    // Process each segment
    for (const segment of segments) {
      if (segment === '.') {
        // Current directory - do nothing
      } else if (segment === '..') {
        // Parent directory - remove the last segment if possible
        if (result.length > 0) {
          result.pop();
        }
      } else {
        result.push(segment);
      }
    }

    // Join the segments and ensure it starts with /
    return '/' + result.join('/');
  }

  // Find a node by path
  findNode(path: string, currentDir: string = '/'): FileSystemNode | null {
    const normalizedPath = this.normalizePath(path, currentDir);
    
    // Special case for root
    if (normalizedPath === '/') {
      return this.root;
    }

    const segments = normalizedPath.split('/').filter(seg => seg !== '');
    let currentNode: FileSystemNode = this.root;

    for (const segment of segments) {
      if (currentNode.type !== FileSystemNodeType.DIRECTORY) {
        return null; // Can't navigate into a file
      }

      const nextNode = (currentNode as DirectoryNode).children.get(segment);
      if (!nextNode) {
        return null; // Path segment not found
      }

      currentNode = nextNode;
    }

    return currentNode;
  }

  // Create a directory at the specified path
  mkdir(path: string, currentDir: string = '/'): boolean {
    const normalizedPath = this.normalizePath(path, currentDir);
    
    // Don't allow creating root again
    if (normalizedPath === '/') {
      return false;
    }

    // Get the parent directory and the new directory name
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    const parentPath = normalizedPath.substring(0, lastSlashIndex) || '/';
    const dirName = normalizedPath.substring(lastSlashIndex + 1);

    // Find the parent directory node
    const parentNode = this.findNode(parentPath);
    if (!parentNode || parentNode.type !== FileSystemNodeType.DIRECTORY) {
      return false; // Parent directory doesn't exist or is a file
    }

    // Check if a node with this name already exists
    if ((parentNode as DirectoryNode).children.has(dirName)) {
      return false; // Node with this name already exists
    }

    // Create the new directory
    const newDir = createDirectoryNode(dirName, parentNode as DirectoryNode);
    (parentNode as DirectoryNode).children.set(dirName, newDir);
    return true;
  }

  // Create directories recursively (like mkdir -p)
  mkdirRecursive(path: string, currentDir: string = '/'): boolean {
    const normalizedPath = this.normalizePath(path, currentDir);
    
    // Don't allow creating root again
    if (normalizedPath === '/') {
      return false;
    }

    const segments = normalizedPath.split('/').filter(seg => seg !== '');
    let currentPath = '';

    for (const segment of segments) {
      currentPath += '/' + segment;
      
      // Check if this segment already exists
      const node = this.findNode(currentPath);
      if (node) {
        // If it exists but is a file, we can't create a directory here
        if (node.type === FileSystemNodeType.FILE) {
          return false;
        }
        // If it's a directory, continue to the next segment
        continue;
      }

      // Create this directory segment
      if (!this.mkdir(currentPath)) {
        return false;
      }
    }

    return true;
  }

  // Create a file at the specified path
  createFile(path: string, content: string = '', currentDir: string = '/'): boolean {
    const normalizedPath = this.normalizePath(path, currentDir);
    
    // Can't create a file at the root path
    if (normalizedPath === '/') {
      return false;
    }

    // Get the parent directory and the file name
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    const parentPath = normalizedPath.substring(0, lastSlashIndex) || '/';
    const fileName = normalizedPath.substring(lastSlashIndex + 1);

    // Find the parent directory node
    const parentNode = this.findNode(parentPath);
    if (!parentNode || parentNode.type !== FileSystemNodeType.DIRECTORY) {
      return false; // Parent directory doesn't exist or is a file
    }

    // Check if a node with this name already exists
    if ((parentNode as DirectoryNode).children.has(fileName)) {
      return false; // Node with this name already exists
    }

    // Create the new file
    const newFile = createFileNode(fileName, parentNode as DirectoryNode, content);
    (parentNode as DirectoryNode).children.set(fileName, newFile);
    return true;
  }

  // Write content to a file
  writeFile(path: string, content: string, currentDir: string = '/'): boolean {
    const fileNode = this.findNode(path, currentDir);
    
    if (!fileNode) {
      // If file doesn't exist, try to create it
      return this.createFile(path, content, currentDir);
    }
    
    if (fileNode.type !== FileSystemNodeType.FILE) {
      return false; // Can't write to a directory
    }

    // Update the file content
    (fileNode as FileNode).content = content;
    return true;
  }

  // Read content from a file
  readFile(path: string, currentDir: string = '/'): string | null {
    const fileNode = this.findNode(path, currentDir);
    
    if (!fileNode || fileNode.type !== FileSystemNodeType.FILE) {
      return null; // File doesn't exist or is a directory
    }

    return (fileNode as FileNode).content;
  }

  // List contents of a directory
  listDirectory(path: string, currentDir: string = '/'): FileSystemNode[] | null {
    const dirNode = this.findNode(path, currentDir);
    
    if (!dirNode || dirNode.type !== FileSystemNodeType.DIRECTORY) {
      return null; // Directory doesn't exist or is a file
    }

    return Array.from((dirNode as DirectoryNode).children.values());
  }

  // Remove a file or directory
  remove(path: string, currentDir: string = '/'): boolean {
    const normalizedPath = this.normalizePath(path, currentDir);
    
    // Can't remove root
    if (normalizedPath === '/') {
      return false;
    }

    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    const parentPath = normalizedPath.substring(0, lastSlashIndex) || '/';
    const nodeName = normalizedPath.substring(lastSlashIndex + 1);

    const parentNode = this.findNode(parentPath);
    if (!parentNode || parentNode.type !== FileSystemNodeType.DIRECTORY) {
      return false; // Parent directory doesn't exist or is a file
    }

    // Remove the node
    return (parentNode as DirectoryNode).children.delete(nodeName);
  }
}
