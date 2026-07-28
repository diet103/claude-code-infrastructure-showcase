// @skip-validation
// Session Intelligence System - Dev Docs Indexer CLI
// Indexes dev doc directories into the SQLite vector database.
//
// Usage:
//   npx tsx .claude/scripts/index-sessions.ts [options]
//
// Options:
//   --full            Reindex everything (ignore incremental state)
//   --dry-run         Show what would be indexed without doing it
//   --verbose         Detailed progress output
//   --dev-dir=PATH    Custom dev directory (default: $CLAUDE_PROJECT_DIR/dev)

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const hooksDir = join(__dirname, '..', 'hooks');

import { VectorStore } from '../hooks/lib/vector-store.js';
import { createEmbeddingProvider } from '../hooks/lib/embeddings.js';
import { scanDevDocs } from '../hooks/lib/session-parser.js';

// ============================================================
// CLI Args
// ============================================================

const args = process.argv.slice(2);
const flags = {
    full: args.includes('--full'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    devDir: args.find(a => a.startsWith('--dev-dir='))?.split('=')[1] || join(process.env.CLAUDE_PROJECT_DIR || '.', 'dev'),
};

function log(msg: string): void {
    console.log(msg);
}

function verbose(msg: string): void {
    if (flags.verbose) console.log(`  ${msg}`);
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
    log('Session Intelligence System - Dev Docs Indexer');
    log('===============================================\n');

    const dbPath = join(hooksDir, 'data', 'sessions.db');

    if (flags.dryRun) {
        log('[DRY RUN MODE - no changes will be made]\n');
    }

    const store = flags.dryRun ? null : new VectorStore(dbPath);
    const provider = flags.dryRun ? null : createEmbeddingProvider();

    if (!existsSync(flags.devDir)) {
        log(`Dev directory not found: ${flags.devDir}`);
        return;
    }

    const docs = scanDevDocs(flags.devDir);
    log(`Found ${docs.length} dev doc directories\n`);

    let indexed = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of docs) {
        const docId = `devdoc:${doc.taskName}`;

        try {
            const contentHash = createHash('md5').update(doc.combinedText).digest('hex');

            // Incremental check
            if (!flags.full && store) {
                const state = store.getIndexingState(docId);
                if (state && state.lastHash === contentHash) {
                    verbose(`SKIP ${doc.taskName} (unchanged)`);
                    skipped++;
                    continue;
                }
            }

            if (flags.dryRun) {
                log(`  WOULD INDEX ${doc.taskName} (${doc.combinedText.length} chars, active: ${doc.isActive})`);
                indexed++;
                continue;
            }

            // Embed and store
            const textToEmbed = doc.combinedText.slice(0, 8000);
            const embedding = await provider!.embed(textToEmbed);

            store!.upsertEmbedding(docId, 'devdoc', 'full_summary', doc.combinedText.slice(0, 2000), embedding);

            store!.upsertMetadata({
                sessionId: docId,
                sourceType: 'devdoc',
                title: doc.taskName,
                totalTurns: 0,
                filesEdited: [],
                toolsUsed: {},
                fileSizeBytes: doc.combinedText.length,
            });

            store!.updateIndexingState(docId, 'devdoc', contentHash);

            verbose(`OK ${doc.taskName} (${doc.combinedText.length} chars)`);
            indexed++;

            // Rate limit delay
            await new Promise(r => setTimeout(r, 100));
        } catch (err) {
            log(`  ERR ${doc.taskName}: ${(err as Error).message}`);
            errors++;
        }
    }

    if (store) store.close();

    log(`\n===============================================`);
    log(`Indexed: ${indexed}, Skipped: ${skipped}, Errors: ${errors} (${docs.length} total)`);

    if (!flags.dryRun) {
        const reopened = new VectorStore(dbPath);
        const stats = reopened.getStats();
        log(`Database: ${stats.embeddings} embeddings, ${stats.devdocs} devdocs`);
        reopened.close();
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
