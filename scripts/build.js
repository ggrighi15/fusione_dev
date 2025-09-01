#!/usr/bin/env node

/**
 * Fusione Core System - Build Script
 * Integrates Oracle JDK 24 binaries and resources into the build process
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Build configuration
const BUILD_CONFIG = {
  jdkPath: path.join(projectRoot, 'dp', 'oracleJdk-24'),
  buildDir: path.join(projectRoot, 'build'),
  distDir: path.join(projectRoot, 'dist'),
  javaLibsDir: path.join(projectRoot, 'build', 'java-libs'),
  javaResourcesDir: path.join(projectRoot, 'build', 'java-resources')
};

class FusioneBuildSystem {
  constructor() {
    this.startTime = Date.now();
    console.log('🚀 Fusione Core System - Build Process Started');
    console.log('📅 Build Time:', new Date().toISOString());
  }

  /**
   * Main build process
   */
  async build() {
    try {
      await this.validateEnvironment();
      await this.prepareBuildDirectories();
      await this.integrateOracleJDK();
      await this.buildNodeModules();
      await this.copyResources();
      await this.generateBuildManifest();
      await this.validateBuild();
      
      this.logSuccess();
    } catch (error) {
      this.logError(error);
      process.exit(1);
    }
  }

  /**
   * Validate build environment
   */
  async validateEnvironment() {
    console.log('\n🔍 Validating build environment...');
    
    // Check if Oracle JDK 24 exists
    if (!fs.existsSync(BUILD_CONFIG.jdkPath)) {
      throw new Error(`Oracle JDK 24 not found at: ${BUILD_CONFIG.jdkPath}`);
    }
    
    // Validate JDK version
    const releaseFile = path.join(BUILD_CONFIG.jdkPath, 'release');
    if (fs.existsSync(releaseFile)) {
      const releaseContent = fs.readFileSync(releaseFile, 'utf8');
      if (!releaseContent.includes('JAVA_VERSION="24.0.2"')) {
        console.warn('⚠️  JDK version mismatch detected');
      } else {
        console.log('✅ Oracle JDK 24.0.2 validated');
      }
    }
    
    // Check Node.js version
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      console.log(`✅ Node.js version: ${nodeVersion}`);
    } catch (error) {
      throw new Error('Node.js not found in PATH');
    }
    
    console.log('✅ Environment validation completed');
  }

  /**
   * Prepare build directories
   */
  async prepareBuildDirectories() {
    console.log('\n📁 Preparing build directories...');
    
    const directories = [
      BUILD_CONFIG.buildDir,
      BUILD_CONFIG.distDir,
      BUILD_CONFIG.javaLibsDir,
      BUILD_CONFIG.javaResourcesDir
    ];
    
    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created: ${path.relative(projectRoot, dir)}`);
    }
  }

  /**
   * Integrate Oracle JDK 24 into build
   */
  async integrateOracleJDK() {
    console.log('\n☕ Integrating Oracle JDK 24...');
    
    // Copy JDK binaries
    const jdkBinDir = path.join(BUILD_CONFIG.jdkPath, 'bin');
    const buildBinDir = path.join(BUILD_CONFIG.buildDir, 'jdk', 'bin');
    
    if (fs.existsSync(jdkBinDir)) {
      fs.mkdirSync(path.dirname(buildBinDir), { recursive: true });
      this.copyDirectory(jdkBinDir, buildBinDir);
      console.log('✅ JDK binaries copied');
    }
    
    // Copy JDK libraries
    const jdkLibDir = path.join(BUILD_CONFIG.jdkPath, 'lib');
    const buildJdkLibDir = path.join(BUILD_CONFIG.buildDir, 'jdk', 'lib');
    
    if (fs.existsSync(jdkLibDir)) {
      this.copyDirectory(jdkLibDir, buildJdkLibDir);
      console.log('✅ JDK libraries copied');
    }
    
    // Copy JDK configuration
    const jdkConfDir = path.join(BUILD_CONFIG.jdkPath, 'conf');
    const buildJdkConfDir = path.join(BUILD_CONFIG.buildDir, 'jdk', 'conf');
    
    if (fs.existsSync(jdkConfDir)) {
      this.copyDirectory(jdkConfDir, buildJdkConfDir);
      console.log('✅ JDK configuration copied');
    }
    
    // Copy JDK modules
    const jdkJmodsDir = path.join(BUILD_CONFIG.jdkPath, 'jmods');
    const buildJdkJmodsDir = path.join(BUILD_CONFIG.buildDir, 'jdk', 'jmods');
    
    if (fs.existsSync(jdkJmodsDir)) {
      this.copyDirectory(jdkJmodsDir, buildJdkJmodsDir);
      console.log('✅ JDK modules copied');
    }
    
    // Copy legal notices
    const jdkLegalDir = path.join(BUILD_CONFIG.jdkPath, 'legal');
    const buildJdkLegalDir = path.join(BUILD_CONFIG.buildDir, 'jdk', 'legal');
    
    if (fs.existsSync(jdkLegalDir)) {
      this.copyDirectory(jdkLegalDir, buildJdkLegalDir);
      console.log('✅ JDK legal notices copied');
    }
    
    // Copy release information
    const releaseFile = path.join(BUILD_CONFIG.jdkPath, 'release');
    const buildReleaseFile = path.join(BUILD_CONFIG.buildDir, 'jdk', 'release');
    
    if (fs.existsSync(releaseFile)) {
      fs.copyFileSync(releaseFile, buildReleaseFile);
      console.log('✅ JDK release information copied');
    }
    
    console.log('✅ Oracle JDK 24 integration completed');
  }

  /**
   * Build Node.js modules
   */
  async buildNodeModules() {
    console.log('\n📦 Building Node.js modules...');
    
    try {
      // Install production dependencies
      execSync('npm ci --only=production', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      
      // Copy node_modules to build directory
      const nodeModulesSource = path.join(projectRoot, 'node_modules');
      const nodeModulesBuild = path.join(BUILD_CONFIG.buildDir, 'node_modules');
      
      if (fs.existsSync(nodeModulesSource)) {
        this.copyDirectory(nodeModulesSource, nodeModulesBuild);
        console.log('✅ Node.js modules built and copied');
      }
    } catch (error) {
      throw new Error(`Failed to build Node.js modules: ${error.message}`);
    }
  }

  /**
   * Copy application resources
   */
  async copyResources() {
    console.log('\n📋 Copying application resources...');
    
    // Copy source code
    const srcDir = path.join(projectRoot, 'src');
    const buildSrcDir = path.join(BUILD_CONFIG.buildDir, 'src');
    
    if (fs.existsSync(srcDir)) {
      this.copyDirectory(srcDir, buildSrcDir);
      console.log('✅ Source code copied');
    }
    
    // Copy configuration files
    const configFiles = ['package.json', 'package-lock.json'];
    for (const file of configFiles) {
      const sourcePath = path.join(projectRoot, file);
      const buildPath = path.join(BUILD_CONFIG.buildDir, file);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, buildPath);
        console.log(`✅ ${file} copied`);
      }
    }
    
    console.log('✅ Application resources copied');
  }

  /**
   * Generate build manifest
   */
  async generateBuildManifest() {
    console.log('\n📄 Generating build manifest...');
    
    const manifest = {
      buildTime: new Date().toISOString(),
      buildVersion: '1.0.0',
      jdkVersion: '24.0.2',
      jdkVendor: 'Oracle Corporation',
      nodeVersion: execSync('node --version', { encoding: 'utf8' }).trim(),
      platform: process.platform,
      architecture: process.arch,
      components: {
        jdk: {
          path: 'jdk',
          version: '24.0.2',
          vendor: 'Oracle Corporation'
        },
        nodejs: {
          path: 'src',
          version: execSync('node --version', { encoding: 'utf8' }).trim()
        },
        modules: {
          path: 'node_modules',
          count: this.countNodeModules()
        }
      }
    };
    
    const manifestPath = path.join(BUILD_CONFIG.buildDir, 'build-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('✅ Build manifest generated');
  }

  /**
   * Validate build output
   */
  async validateBuild() {
    console.log('\n🔍 Validating build output...');
    
    const requiredPaths = [
      path.join(BUILD_CONFIG.buildDir, 'jdk', 'bin'),
      path.join(BUILD_CONFIG.buildDir, 'jdk', 'lib'),
      path.join(BUILD_CONFIG.buildDir, 'src'),
      path.join(BUILD_CONFIG.buildDir, 'package.json'),
      path.join(BUILD_CONFIG.buildDir, 'build-manifest.json')
    ];
    
    for (const requiredPath of requiredPaths) {
      if (!fs.existsSync(requiredPath)) {
        throw new Error(`Required build artifact missing: ${requiredPath}`);
      }
    }
    
    console.log('✅ Build validation completed');
  }

  /**
   * Copy directory recursively
   */
  copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    const items = fs.readdirSync(source);
    
    for (const item of items) {
      const sourcePath = path.join(source, item);
      const destPath = path.join(destination, item);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * Count Node.js modules
   */
  countNodeModules() {
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      return 0;
    }
    
    return fs.readdirSync(nodeModulesPath).filter(item => {
      return !item.startsWith('.');
    }).length;
  }

  /**
   * Log success message
   */
  logSuccess() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log('\n🎉 Build completed successfully!');
    console.log(`⏱️  Build duration: ${duration}s`);
    console.log(`📁 Build output: ${BUILD_CONFIG.buildDir}`);
    console.log('\n📋 Build Summary:');
    console.log('   ✅ Oracle JDK 24 integrated');
    console.log('   ✅ Node.js modules built');
    console.log('   ✅ Application resources copied');
    console.log('   ✅ Build manifest generated');
    console.log('   ✅ Build validation passed');
  }

  /**
   * Log error message
   */
  logError(error) {
    console.error('\n❌ Build failed!');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Execute build if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new FusioneBuildSystem();
  builder.build();
}

export default FusioneBuildSystem;