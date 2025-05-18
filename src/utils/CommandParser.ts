import { MountManager } from '../models/MountManager';
import { FileSystemNodeType } from '../models/FileSystem';

export type CommandResult = {
  success: boolean;
  message: string;
  data?: any;
};

export class CommandParser {
  private mountManager: MountManager;

  constructor(mountManager: MountManager) {
    this.mountManager = mountManager;
  }

  // Parse and execute a command
  parseCommand(cmdLine: string): CommandResult {
    // Split the command line by spaces, but keep quoted parts together
    const parts: string[] = [];
    let currentPart = '';
    let inQuotes = false;
    let escaping = false;

    for (let i = 0; i < cmdLine.length; i++) {
      const char = cmdLine[i];

      if (escaping) {
        // Add the escaped character
        currentPart += char;
        escaping = false;
        continue;
      }

      if (char === '\\') {
        escaping = true;
        continue;
      }

      if (char === '"' || char === "'") {
        // Toggle quote state
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ' ' && !inQuotes) {
        // Space outside quotes means end of part
        if (currentPart) {
          parts.push(currentPart);
          currentPart = '';
        }
        continue;
      }

      // Add the character to the current part
      currentPart += char;
    }

    // Add the last part if there is one
    if (currentPart) {
      parts.push(currentPart);
    }

    if (parts.length === 0) {
      return { success: true, message: '' };
    }

    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'mkdir':
          return this.handleMkdir(args);
        case 'create_file':
          return this.handleCreateFile(args);
        case 'write_file':
          return this.handleWriteFile(args);
        case 'read_file':
          return this.handleReadFile(args);
        case 'ls':
          return this.handleLs(args);
        case 'cd':
          return this.handleCd(args);
        case 'pwd':
          return this.handlePwd();
        case 'mount':
          return this.handleMount(args);
        case 'unmount':
          return this.handleUnmount(args);
        case 'mounts':
          return this.handleListMounts();
        case 'rm':
          return this.handleRemove(args);
        case 'cp':
          return this.handleCopy(args);
        case 'help':
          return this.handleHelp();
        case 'clear':
          return { success: true, message: 'CLEAR_SCREEN' };
        case 'exit':
          return { success: true, message: 'EXIT' };
        default:
          return { success: false, message: `Command not found: ${command}` };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Error executing command: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  // Handle mkdir command
  private handleMkdir(args: string[]): CommandResult {
    if (args.length < 1) {
      return { success: false, message: 'Usage: mkdir <path>' };
    }

    const path = args[0];
    const recursive = args.includes('-p');

    let success;
    if (recursive) {
      success = this.mountManager.mkdirRecursive(path);
    } else {
      success = this.mountManager.mkdir(path);
    }

    if (success) {
      return { success: true, message: `Directory created: ${path}` };
    } else {
      return { success: false, message: `Failed to create directory: ${path}` };
    }
  }

  // Handle create_file command
  private handleCreateFile(args: string[]): CommandResult {
    if (args.length < 1) {
      return { success: false, message: 'Usage: create_file <path>' };
    }

    const path = args[0];
    const success = this.mountManager.createFile(path);

    if (success) {
      return { success: true, message: `File created: ${path}` };
    } else {
      return { success: false, message: `Failed to create file: ${path}` };
    }
  }

  // Handle write_file command
  private handleWriteFile(args: string[]): CommandResult {
    if (args.length < 2) {
      return { success: false, message: 'Usage: write_file <path> <content>' };
    }

    const path = args[0];
    const content = args.slice(1).join(' ');

    const success = this.mountManager.writeFile(path, content);

    if (success) {
      return { success: true, message: `Content written to: ${path}` };
    } else {
      return { success: false, message: `Failed to write to file: ${path}` };
    }
  }

  // Handle read_file command
  private handleReadFile(args: string[]): CommandResult {
    if (args.length < 1) {
      return { success: false, message: 'Usage: read_file <path>' };
    }

    const path = args[0];
    const content = this.mountManager.readFile(path);

    if (content !== null) {
      return { 
        success: true, 
        message: `Content of ${path}:\n${content}` 
      };
    } else {
      return { success: false, message: `Failed to read file: ${path}` };
    }
  }

  // Handle ls command
  private handleLs(args: string[]): CommandResult {
    const path = args.length > 0 ? args[0] : '.';
    const nodes = this.mountManager.listDirectory(path);

    if (nodes === null) {
      return { success: false, message: `Cannot list directory: ${path}` };
    }

    if (nodes.length === 0) {
      return { success: true, message: '<empty directory>' };
    }

    // Sort with directories first, then files
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === FileSystemNodeType.DIRECTORY ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    const output = nodes.map(node => {
      const isDir = node.type === FileSystemNodeType.DIRECTORY;
      const name = isDir ? node.name + '/' : node.name;
      return { name, isDirectory: isDir };
    });

    return { 
      success: true, 
      message: 'Directory listing:', 
      data: output
    };
  }

  // Handle cd command
  private handleCd(args: string[]): CommandResult {
    if (args.length < 1) {
      // Default to home directory
      const success = this.mountManager.setCurrentDirectory('/');
      return { success, message: success ? 'Changed to /' : 'Failed to change directory' };
    }

    const path = args[0];
    const success = this.mountManager.setCurrentDirectory(path);

    if (success) {
      return { success: true, message: `Changed to ${this.mountManager.getCurrentDirectory()}` };
    } else {
      return { success: false, message: `Failed to change directory: ${path}` };
    }
  }

  // Handle pwd command
  private handlePwd(): CommandResult {
    return { 
      success: true, 
      message: this.mountManager.getCurrentDirectory() 
    };
  }

  // Handle mount command
  private handleMount(args: string[]): CommandResult {
    if (args.length < 2) {
      return { success: false, message: 'Usage: mount <fs_type> <mount_point>' };
    }

    const fsType = args[0];
    const mountPoint = args[1];

    const success = this.mountManager.mount(fsType, mountPoint);

    if (success) {
      return { success: true, message: `Mounted ${fsType} filesystem at ${mountPoint}` };
    } else {
      return { success: false, message: `Failed to mount filesystem at ${mountPoint}` };
    }
  }

  // Handle unmount command
  private handleUnmount(args: string[]): CommandResult {
    if (args.length < 1) {
      return { success: false, message: 'Usage: unmount <mount_point>' };
    }

    const mountPoint = args[0];
    const success = this.mountManager.unmount(mountPoint);

    if (success) {
      return { success: true, message: `Unmounted filesystem from ${mountPoint}` };
    } else {
      return { success: false, message: `Failed to unmount filesystem from ${mountPoint}` };
    }
  }

  // Handle mounts (list mounts) command
  private handleListMounts(): CommandResult {
    const mounts = this.mountManager.getMounts();
    
    if (mounts.length === 0) {
      return { success: true, message: 'No mounted filesystems' };
    }
    
    const mountsList = mounts.map(m => {
      return { 
        mountPoint: m.path, 
        fsType: m.filesystem.fsType 
      };
    });
    
    return { 
      success: true, 
      message: 'Mounted filesystems:', 
      data: mountsList
    };
  }

  // Handle rm command
  private handleRemove(args: string[]): CommandResult {
    if (args.length < 1) {
      return { success: false, message: 'Usage: rm <path>' };
    }

    const path = args[0];
    const success = this.mountManager.remove(path);

    if (success) {
      return { success: true, message: `Removed ${path}` };
    } else {
      return { success: false, message: `Failed to remove ${path}` };
    }
  }

  // Handle cp (copy) command
  private handleCopy(args: string[]): CommandResult {
    if (args.length < 2) {
      return { success: false, message: 'Usage: cp <source_path> <destination_path>' };
    }

    const sourcePath = args[0];
    const destPath = args[1];
    
    // Read the source file
    const content = this.mountManager.readFile(sourcePath);
    
    if (content === null) {
      return { success: false, message: `Failed to read source file: ${sourcePath}` };
    }
    
    // Write to the destination file
    const success = this.mountManager.writeFile(destPath, content);
    
    if (success) {
      return { success: true, message: `File copied from ${sourcePath} to ${destPath}` };
    } else {
      return { success: false, message: `Failed to copy to destination: ${destPath}` };
    }
  }

  // Handle help command
  private handleHelp(): CommandResult {
    const helpText = `
Available commands:
  mkdir <path> [-p]     - Create a directory (use -p for recursive creation)
  create_file <path>    - Create an empty file
  write_file <path> <content> - Write content to a file
  read_file <path>      - Display file content
  ls [path]             - List directory contents
  cd <path>             - Change current directory
  pwd                   - Print working directory
  mount <fs_type> <mount_point> - Mount a new filesystem
  unmount <mount_point> - Unmount a filesystem
  mounts                - List mounted filesystems
  rm <path>             - Remove a file or directory
  cp <source> <dest>    - Copy a file from source to destination
  clear                 - Clear the screen
  help                  - Show this help
  exit                  - Exit the CLI
    `.trim();
    
    return { success: true, message: helpText };
  }
}
