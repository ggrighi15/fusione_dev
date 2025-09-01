/**
 * Java Environment Configuration
 * Oracle JDK 24 Environment Setup for Fusione Core System
 */

import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Java Environment Configuration
 */
export const JAVA_CONFIG = {
  // Oracle JDK 24 Configuration
  JDK_VERSION: '24.0.2',
  JDK_VENDOR: 'Oracle Corporation',
  JDK_BUILD: '24.0.2+12-54',
  
  // Paths
  JAVA_HOME: process.env.JAVA_HOME || path.join(projectRoot, 'dp', 'oracleJdk-24'),
  JDK_BIN: null, // Will be set dynamically
  JDK_LIB: null, // Will be set dynamically
  JDK_CONF: null, // Will be set dynamically
  
  // Runtime Configuration
  JAVA_OPTS: [
    '-Xmx2g',
    '-Xms512m',
    '-XX:+UseG1GC',
    '-XX:+UseStringDeduplication',
    '-XX:MaxGCPauseMillis=200',
    '-Djava.awt.headless=true',
    '-Dfile.encoding=UTF-8',
    '-Duser.timezone=UTC'
  ],
  
  // Module System Configuration
  MODULE_PATH: [],
  ADD_MODULES: [
    'java.base',
    'java.logging',
    'java.management',
    'java.naming',
    'java.net.http',
    'java.security.jgss',
    'java.sql',
    'java.xml'
  ],
  
  // Security Configuration
  SECURITY_PROPS: {
    'java.security.manager': '',
    'java.security.policy': 'all.policy',
    'networkaddress.cache.ttl': '60',
    'networkaddress.cache.negative.ttl': '10'
  }
};

/**
 * Initialize Java Environment
 */
export function initializeJavaEnvironment() {
  // Set dynamic paths
  JAVA_CONFIG.JDK_BIN = path.join(JAVA_CONFIG.JAVA_HOME, 'bin');
  JAVA_CONFIG.JDK_LIB = path.join(JAVA_CONFIG.JAVA_HOME, 'lib');
  JAVA_CONFIG.JDK_CONF = path.join(JAVA_CONFIG.JAVA_HOME, 'conf');
  
  // Set environment variables
  process.env.JAVA_HOME = JAVA_CONFIG.JAVA_HOME;
  process.env.JDK_HOME = JAVA_CONFIG.JAVA_HOME;
  process.env.JAVA_VERSION = JAVA_CONFIG.JDK_VERSION;
  process.env.JDK_VENDOR = JAVA_CONFIG.JDK_VENDOR;
  
  // Update PATH
  const currentPath = process.env.PATH || '';
  const javaBinPath = JAVA_CONFIG.JDK_BIN;
  
  if (!currentPath.includes(javaBinPath)) {
    const pathSeparator = os.platform() === 'win32' ? ';' : ':';
    process.env.PATH = `${javaBinPath}${pathSeparator}${currentPath}`;
  }
  
  // Set Java options
  process.env.JAVA_OPTS = JAVA_CONFIG.JAVA_OPTS.join(' ');
  process.env._JAVA_OPTIONS = JAVA_CONFIG.JAVA_OPTS.join(' ');
  
  // Set module configuration
  if (JAVA_CONFIG.ADD_MODULES.length > 0) {
    process.env.ADD_MODULES = JAVA_CONFIG.ADD_MODULES.join(',');
  }
  
  return JAVA_CONFIG;
}

/**
 * Get Java executable path
 */
export function getJavaExecutable() {
  const javaExe = os.platform() === 'win32' ? 'java.exe' : 'java';
  return path.join(JAVA_CONFIG.JDK_BIN, javaExe);
}

/**
 * Get Javac executable path
 */
export function getJavacExecutable() {
  const javacExe = os.platform() === 'win32' ? 'javac.exe' : 'javac';
  return path.join(JAVA_CONFIG.JDK_BIN, javacExe);
}

/**
 * Get Jar executable path
 */
export function getJarExecutable() {
  const jarExe = os.platform() === 'win32' ? 'jar.exe' : 'jar';
  return path.join(JAVA_CONFIG.JDK_BIN, jarExe);
}

/**
 * Validate Java installation
 */
export async function validateJavaInstallation() {
  const { execSync } = await import('child_process');
  const fs = await import('fs');
  
  try {
    // Check if JAVA_HOME exists
    if (!fs.existsSync(JAVA_CONFIG.JAVA_HOME)) {
      throw new Error(`JAVA_HOME directory not found: ${JAVA_CONFIG.JAVA_HOME}`);
    }
    
    // Check if java executable exists
    const javaExe = getJavaExecutable();
    if (!fs.existsSync(javaExe)) {
      throw new Error(`Java executable not found: ${javaExe}`);
    }
    
    // Check Java version
    const javaVersion = execSync(`"${javaExe}" -version`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (!javaVersion.includes('24.0.2')) {
      console.warn('Warning: Java version mismatch detected');
    }
    
    // Check javac executable
    const javacExe = getJavacExecutable();
    if (!fs.existsSync(javacExe)) {
      throw new Error(`Javac executable not found: ${javacExe}`);
    }
    
    return {
      valid: true,
      javaHome: JAVA_CONFIG.JAVA_HOME,
      javaVersion: JAVA_CONFIG.JDK_VERSION,
      javaVendor: JAVA_CONFIG.JDK_VENDOR,
      javaExecutable: javaExe,
      javacExecutable: javacExe
    };
    
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * Get Java system properties
 */
export function getJavaSystemProperties() {
  return {
    'java.version': JAVA_CONFIG.JDK_VERSION,
    'java.vendor': JAVA_CONFIG.JDK_VENDOR,
    'java.home': JAVA_CONFIG.JAVA_HOME,
    'java.class.path': process.env.CLASSPATH || '',
    'java.library.path': JAVA_CONFIG.JDK_LIB,
    'java.io.tmpdir': process.env.TEMP || process.env.TMP || '/tmp',
    'user.dir': process.cwd(),
    'user.home': os.homedir(),
    'user.name': os.userInfo().username,
    'os.name': os.type(),
    'os.arch': os.arch(),
    'os.version': os.release(),
    'file.separator': path.sep,
    'path.separator': os.platform() === 'win32' ? ';' : ':',
    'line.separator': os.EOL
  };
}

/**
 * Create Java command with options
 */
export function createJavaCommand(mainClass, classpath = [], jvmArgs = [], programArgs = []) {
  const javaExe = getJavaExecutable();
  const command = [`"${javaExe}"`];
  
  // Add JVM arguments
  command.push(...JAVA_CONFIG.JAVA_OPTS);
  command.push(...jvmArgs);
  
  // Add classpath
  if (classpath.length > 0) {
    const pathSeparator = os.platform() === 'win32' ? ';' : ':';
    command.push('-cp', `"${classpath.join(pathSeparator)}"`);
  }
  
  // Add main class
  command.push(mainClass);
  
  // Add program arguments
  command.push(...programArgs);
  
  return command.join(' ');
}

/**
 * Export configuration for use in other modules
 */
export default {
  JAVA_CONFIG,
  initializeJavaEnvironment,
  getJavaExecutable,
  getJavacExecutable,
  getJarExecutable,
  validateJavaInstallation,
  getJavaSystemProperties,
  createJavaCommand
};