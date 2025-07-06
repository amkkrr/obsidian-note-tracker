const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 开发模式启动脚本
console.log('🚀 Starting Obsidian Note View Tracker Plugin Development...');

// 检查是否安装了依赖
if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    exec('npm install', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error installing dependencies: ${error}`);
            return;
        }
        console.log('✅ Dependencies installed successfully');
        startDevelopment();
    });
} else {
    startDevelopment();
}

function startDevelopment() {
    console.log('🔧 Starting development build...');
    
    // 启动开发模式构建
    const buildProcess = exec('npm run dev', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Build error: ${error}`);
            return;
        }
    });

    // 输出构建日志
    buildProcess.stdout.on('data', (data) => {
        console.log(`📦 Build: ${data}`);
    });

    buildProcess.stderr.on('data', (data) => {
        console.error(`⚠️  Build Warning: ${data}`);
    });

    console.log('🎯 Development server started!');
    console.log('📝 Edit your TypeScript files in the src/ directory');
    console.log('🔄 Changes will be automatically rebuilt');
    console.log('🛑 Press Ctrl+C to stop the development server');
}