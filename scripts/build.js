const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Starting production build...');

// 确保清理旧的构建文件
if (fs.existsSync('main.js')) {
    fs.unlinkSync('main.js');
    console.log('🗑️  Cleaned old build files');
}

// 运行 TypeScript 类型检查
console.log('🔍 Running TypeScript type checking...');
exec('npx tsc --noEmit', (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ TypeScript errors found: ${error}`);
        process.exit(1);
    }
    
    console.log('✅ TypeScript type checking passed');
    
    // 运行 ESLint 检查
    console.log('🔍 Running ESLint...');
    exec('npm run lint', (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ ESLint errors found: ${error}`);
            process.exit(1);
        }
        
        console.log('✅ ESLint checks passed');
        
        // 运行生产构建
        console.log('📦 Building production bundle...');
        exec('npm run build', (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Build failed: ${error}`);
                process.exit(1);
            }
            
            console.log('✅ Production build completed successfully!');
            console.log('📄 Generated files:');
            console.log('   - main.js (plugin bundle)');
            console.log('   - manifest.json (plugin manifest)');
            console.log('🎉 Your plugin is ready for distribution!');
        });
    });
});