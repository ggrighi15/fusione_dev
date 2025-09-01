/**
 * Script de Análise de Contingências - Período Expandido
 * Analisa arquivos disponíveis no período de 2015-2030 com padrões mm-aaaa melhorados
 */

const fs = require('fs');
const path = require('path');

// Configurações
const YEAR_DIRS = [
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2015",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2016",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2017",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2018",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2019",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2020",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2021",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2022",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2023",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2024",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2025",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2026",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2027",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2028",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2029",
    "C:\\Users\\Gustavo_ri\\OneDrive - BORRACHAS VIPAL S A\\Relatórios Contingências\\2030",
];

const IGNORE_PREFIXES = ["relatório de contingências", "relatorio de contingencias"];

/**
 * Versão melhorada da função is_monthly_report com padrões expandidos
 */
function isMonthlyReportExtended(fileName) {
    const name = fileName.toLowerCase().replace(/\.[^/.]+$/, ""); // remove extensão
    
    const patterns = [
        // Padrões básicos mm-aaaa
        /^\d{2}-\d{4}$/,  // 01-2024
        /^\d{1,2}-\d{4}$/,  // 1-2024 ou 01-2024
        /^\d{2}\.\d{4}$/,  // 01.2024
        /^\d{1,2}\.\d{4}$/,  // 1.2024 ou 01.2024
        /^\d{2}_\d{4}$/,  // 01_2024
        /^\d{1,2}_\d{4}$/,  // 1_2024 ou 01_2024
        
        // Padrões especiais identificados no relatório
        /^\d{2}\s*e\s*\d{2}-\d{4}$/,  // 05 e 06-2025
        /^\d{1,2}\s*e\s*\d{1,2}-\d{4}$/,  // 5 e 6-2025
        /^\d{2}-\d{4}e\d{2}-\d{4}$/,  // 12-2024e01-2025
        /^\d{1,2}-\d{4}e\d{1,2}-\d{4}$/,  // 12-2024e1-2025
        
        // Padrões com espaços
        /^\d{2}\s+-\s*\d{4}$/,  // 01 - 2024
        /^\d{1,2}\s+-\s*\d{4}$/,  // 1 - 2024
        
        // Padrões com mês por extenso abreviado
        /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-?\d{4}$/,  // jan2024, jan-2024
        /^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)-?\d{4}$/,
    ];
    
    return patterns.some(pattern => pattern.test(name));
}

/**
 * Verifica se o arquivo deve ser ignorado
 */
function fileShouldSkip(fileName) {
    const name = fileName.toLowerCase().replace(/\.[^/.]+$/, "");
    return IGNORE_PREFIXES.some(prefix => name.startsWith(prefix));
}

/**
 * Obtém informações detalhadas do arquivo
 */
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            path: filePath,
            name: path.basename(filePath),
            sizeMB: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
            modified: stats.mtime.toISOString().slice(0, 19).replace('T', ' '),
            extension: path.extname(filePath).toLowerCase()
        };
    } catch (error) {
        return {
            path: filePath,
            name: path.basename(filePath),
            sizeMB: 0,
            modified: 'N/A',
            extension: path.extname(filePath).toLowerCase(),
            error: error.message
        };
    }
}

/**
 * Identifica o padrão usado no nome do arquivo
 */
function identifyPattern(fileName) {
    const name = fileName.toLowerCase().replace(/\.[^/.]+$/, "");
    
    if (/^\d{1,2}-\d{4}$/.test(name)) return 'mm-aaaa';
    if (/^\d{1,2}\s*e\s*\d{1,2}-\d{4}$/.test(name)) return 'mm e mm-aaaa';
    if (/^\d{1,2}-\d{4}e\d{1,2}-\d{4}$/.test(name)) return 'mm-aaaemm-aaaa';
    if (/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/.test(name)) return 'mês-aaaa';
    return 'outros';
}

/**
 * Analisa todos os arquivos de contingências no período expandido
 */
function analyzeContingenciasFiles() {
    console.log("=".repeat(80));
    console.log("ANÁLISE DE ARQUIVOS DE CONTINGÊNCIAS - PERÍODO EXPANDIDO (2015-2030)");
    console.log("=".repeat(80));
    console.log(`Gerado em: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);
    console.log();
    
    // Estatísticas gerais
    const totalDirs = YEAR_DIRS.length;
    let existingDirs = 0;
    let totalFiles = 0;
    let monthlyFiles = 0;
    let ignoredFiles = 0;
    let totalSizeMB = 0;
    
    // Agrupamento por ano
    const filesByYear = {};
    const patternStats = {};
    
    console.log("📁 ANÁLISE DE DIRETÓRIOS:");
    console.log("-".repeat(40));
    
    for (const yearDir of YEAR_DIRS) {
        const year = path.basename(yearDir);
        
        try {
            if (fs.existsSync(yearDir) && fs.statSync(yearDir).isDirectory()) {
                existingDirs++;
                console.log(`✅ ${year}: ${yearDir}`);
                
                // Buscar arquivos Excel
                const extensions = ['.xlsx', '.xlsm', '.xls'];
                const files = fs.readdirSync(yearDir)
                    .filter(file => extensions.includes(path.extname(file).toLowerCase()));
                
                for (const file of files) {
                    const filePath = path.join(yearDir, file);
                    totalFiles++;
                    const fileInfo = getFileInfo(filePath);
                    totalSizeMB += fileInfo.sizeMB;
                    
                    if (fileShouldSkip(file)) {
                        ignoredFiles++;
                        continue;
                    }
                    
                    if (isMonthlyReportExtended(file)) {
                        monthlyFiles++;
                        
                        if (!filesByYear[year]) {
                            filesByYear[year] = [];
                        }
                        filesByYear[year].push(fileInfo);
                        
                        // Identificar padrão usado
                        const pattern = identifyPattern(file);
                        patternStats[pattern] = (patternStats[pattern] || 0) + 1;
                    }
                }
            } else {
                console.log(`❌ ${year}: Diretório não encontrado`);
            }
        } catch (error) {
            console.log(`❌ ${year}: Erro ao acessar diretório - ${error.message}`);
        }
    }
    
    console.log(`\n📊 RESUMO EXECUTIVO:`);
    console.log("-".repeat(40));
    console.log(`• Diretórios configurados: ${totalDirs}`);
    console.log(`• Diretórios existentes: ${existingDirs}`);
    console.log(`• Total de arquivos Excel: ${totalFiles}`);
    console.log(`• Arquivos com padrão mm-aaaa: ${monthlyFiles}`);
    console.log(`• Arquivos ignorados: ${ignoredFiles}`);
    console.log(`• Tamanho total: ${totalSizeMB.toFixed(2)} MB`);
    
    console.log(`\n📈 ESTATÍSTICAS POR PADRÃO:`);
    console.log("-".repeat(40));
    Object.entries(patternStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([pattern, count]) => {
            console.log(`• ${pattern}: ${count} arquivos`);
        });
    
    console.log(`\n📅 ARQUIVOS POR ANO:`);
    console.log("-".repeat(40));
    
    Object.keys(filesByYear)
        .sort()
        .forEach(year => {
            const files = filesByYear[year];
            const yearSize = files.reduce((sum, f) => sum + f.sizeMB, 0);
            console.log(`\n🗓️  ${year} (${files.length} arquivos, ${yearSize.toFixed(2)} MB):`);
            
            files
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(fileInfo => {
                    const status = fileInfo.error ? "⚠️ ERRO" : "✅";
                    console.log(`   ${status} ${fileInfo.name} (${fileInfo.sizeMB} MB, ${fileInfo.modified})`);
                });
        });
    
    console.log(`\n🎯 RECOMENDAÇÕES:`);
    console.log("-".repeat(40));
    
    if (monthlyFiles === 0) {
        console.log("⚠️  Nenhum arquivo com padrão mm-aaaa encontrado");
        console.log("   Verifique se os diretórios estão corretos e acessíveis");
    } else if (monthlyFiles < 12) {
        console.log(`⚠️  Apenas ${monthlyFiles} arquivos encontrados`);
        console.log("   Considere verificar se há arquivos em outros formatos ou locais");
    } else {
        console.log(`✅ ${monthlyFiles} arquivos identificados com sucesso`);
        console.log("   Sistema pronto para processamento");
    }
    
    if (existingDirs < totalDirs) {
        const missing = totalDirs - existingDirs;
        console.log(`⚠️  ${missing} diretórios não encontrados`);
        console.log("   Considere criar os diretórios ou ajustar a configuração");
    }
    
    console.log("\n" + "=".repeat(80));
}

// Executar análise
if (require.main === module) {
    analyzeContingenciasFiles();
}

module.exports = {
    analyzeContingenciasFiles,
    isMonthlyReportExtended,
    fileShouldSkip,
    getFileInfo
};