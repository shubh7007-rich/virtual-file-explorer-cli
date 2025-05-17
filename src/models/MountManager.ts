
import { FileSystem, FileSystemNode, FileSystemNodeType } from './FileSystem';

export interface MountPoint {
  path: string;        // Path where the filesystem is mounted
  filesystem: FileSystem;
}

export class MountManager {
  private mounts: MountPoint[] = [];
  private rootFS: FileSystem;
  private currentDirectory: string = '/';

  constructor() {
    // Create the root filesystem
    this.rootFS = new FileSystem('root', 'ext4');
    
    // Add the root filesystem as the first mount
    this.mounts.push({
      path: '/',
      filesystem: this.rootFS
    });
  }

  // Get all mount points
  getMounts(): MountPoint[] {
    return [...this.mounts];
  }

  // Get the current working directory
  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  // Set the current working directory
  setCurrentDirectory(newDir: string): boolean {
    // Normalize the path
    const normalized = this.normalizePath(newDir);
    
    // Check if the directory exists
    const { fs, relativePath } = this.findResponsibleFilesystem(normalized);
    const node = fs.findNode(relativePath, '/');
    
    if (!node || node.type !== FileSystemNodeType.DIRECTORY) {
      return false;
    }
    
    this.currentDirectory = normalized;
    return true;
  }

  // Get the file system tree starting from the root
  getFileSystemTree(): FileSystemNode {
    // Get the root node from the root filesystem
    const rootNode = this.rootFS.findNode('/') as FileSystemNode;
    
    // Process mounted filesystems recursively
    const processedTree = this.processMountPoints(rootNode, '/');
    
    return processedTree;
  }

  // Process mount points recursively to create a unified file system tree
  private processMountPoints(node: FileSystemNode, path: string): FileSystemNode {
    // If node is not a directory, it can't have mount points
    if (node.type !== FileSystemNodeType.DIRECTORY) {
      return node;
    }

    // Create a copy of the directory node
    const processedNode = { ...node };
    
    // For each mount point under this path
    for (const mount of this.mounts) {
      // Skip the root mount as it's already processed
      if (mount.path === '/') continue;
      
      // Check if this mount is directly under the current path
      if (mount.path === path || mount.path.startsWith(path + '/')) {
        const relativeMountPath = mount.path.substring(path.length === 1 ? 1 : path.length + 1);
        const segments = relativeMountPath.split('/');
        
        // If this is a direct mount point
        if (segments[0] === '') {
          // Get the root of the mounted filesystem
          const mountedRoot = mount.filesystem.findNode('/');
          if (mountedRoot) {
            return mountedRoot;
          }
        }
      }
    }
    
    return processedNode;
  }

  // Find the filesystem responsible for a given path
  private findResponsibleFilesystem(path: string): { fs: FileSystem, relativePath: string } {
    // Sort mounts by path length (descending) so we match the most specific mount first
    const sortedMounts = [...this.mounts].sort(
      (a, b) => b.path.length - a.path.length
    );
    
    for (const mount of sortedMounts) {
      // If path starts with mount path, this filesystem is responsible
      if (path === mount.path || path.startsWith(`${mount.path}/`)) {
        // Calculate the relative path within this filesystem
        const relativePath = path === mount.path ? 
          '/' : 
          path.substring(mount.path.length);
          
        return { fs: mount.filesystem, relativePath };
      }
    }
    
    // If no specific mount found, use the root filesystem
    return { fs: this.rootFS, relativePath: path };
  }

  // Normalize path relative to current directory
  normalizePath(path: string): string {
    // If path is absolute, keep it as is
    if (path.startsWith('/')) {
      // Just normalize consecutive slashes
      return path.replace(/\/+/g, '/');
    }
    
    // For relative paths, prepend current directory
    let fullPath = `${this.currentDirectory}/${path}`;
    
    // Split the path and handle . and ..
    const segments = fullPath.split('/').filter(seg => seg !== '');
    const result: string[] = [];

    for (const segment of segments) {
      if (segment === '.') {
        // Current directory - do nothing
      } else if (segment === '..') {
        // Parent directory - remove the last segment
        if (result.length > 0) {
          result.pop();
        }
      } else {
        result.push(segment);
      }
    }

    return '/' + result.join('/');
  }

  // Mount a filesystem at a specific path
  mount(fsType: string, mountPoint: string): boolean {
    // Normalize the mount point path
    const normalizedPath = this.normalizePath(mountPoint);
    
    // Check if this path is already mounted
    if (this.mounts.some(m => m.path === normalizedPath)) {
      return false;
    }
    
    // Create the directory for the mount point if it doesn't exist
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    const node = fs.findNode(relativePath);
    
    if (!node) {
      // Create the directory
      if (!fs.mkdirRecursive(relativePath)) {
        return false;
      }
    } else if (node.type !== FileSystemNodeType.DIRECTORY) {
      // Can't mount on a file
      return false;
    }

    // Create a new filesystem and mount it
    const newFS = new FileSystem(`mount_${this.mounts.length}`, fsType);
    this.mounts.push({
      path: normalizedPath,
      filesystem: newFS
    });
    
    return true;
  }

  // Unmount a filesystem
  unmount(mountPoint: string): boolean {
    // Normalize the mount point path
    const normalizedPath = this.normalizePath(mountPoint);
    
    // Can't unmount root
    if (normalizedPath === '/') {
      return false;
    }
    
    // Find the mount
    const index = this.mounts.findIndex(m => m.path === normalizedPath);
    if (index === -1) {
      return false;
    }
    
    // Remove the mount
    this.mounts.splice(index, 1);
    return true;
  }

  // Create a directory
  mkdir(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.mkdir(relativePath);
  }

  // Create directories recursively
  mkdirRecursive(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.mkdirRecursive(relativePath);
  }

  // Create a file
  createFile(path: string, content: string = ''): boolean {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.createFile(relativePath, content);
  }

  // Write to a file
  writeFile(path: string, content: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.writeFile(relativePath, content);
  }

  // Read from a file
  readFile(path: string): string | null {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.readFile(relativePath);
  }

  // List contents of a directory
  listDirectory(path: string): FileSystemNode[] | null {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.listDirectory(relativePath);
  }

  // Remove a file or directory
  remove(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const { fs, relativePath } = this.findResponsibleFilesystem(normalizedPath);
    return fs.remove(relativePath);
  }
}
