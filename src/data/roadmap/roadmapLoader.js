/**
 * Lazy Loader for Sharded Japanese Interactive Roadmap Data
 * Fetches lightweight ja_manifest.json (< 85KB) and loads stage chunks (85-290KB) on demand.
 */

import { JA_ROADMAP_STAGES } from './jaCurriculum';

let manifestCache = null;
let manifestPromise = null;
const stageChunkCache = new Map();
const stageChunkPromises = new Map();

const normalizeLegacyStages = () => {
    return (JA_ROADMAP_STAGES || []).map((st) => ({
        ...st,
        jlptLevel: st.stage === 1 ? 'Kana' : st.stage <= 3 ? 'N5' : 'N4',
        units: [
            {
                id: `${st.id}_u1`,
                title: st.title,
                subtitle: st.sub,
                lessons: st.lessons || []
            }
        ],
        lessons: st.lessons || []
    }));
};

export const getSynchronouslyCachedStages = () => {
    if (manifestCache?.stages?.length > 0) {
        return manifestCache.stages.map((m) => stageChunkCache.get(m.stage) || m);
    }
    return normalizeLegacyStages();
};

export const loadRoadmapManifest = async () => {
    if (manifestCache) return manifestCache;
    if (manifestPromise) return manifestPromise;

    manifestPromise = (async () => {
        try {
            const res = await fetch('/data/roadmap/ja_manifest.json');
            if (res && res.ok) {
                const json = await res.json();
                if (json && Array.isArray(json.stages) && json.stages.length > 0) {
                    manifestCache = json;
                    return json;
                }
            }
        } catch (err) {
            console.warn('[roadmapLoader] Fallback to bundled stages:', err?.message);
        }
        return null;
    })().finally(() => {
        manifestPromise = null;
    });

    return manifestPromise;
};

export const loadRoadmapStageChunk = async (stageNum) => {
    const num = Number(stageNum);
    if (!num) return null;
    if (stageChunkCache.has(num)) return stageChunkCache.get(num);
    if (stageChunkPromises.has(num)) return stageChunkPromises.get(num);

    const promise = (async () => {
        try {
            const manifest = await loadRoadmapManifest();
            const stageMeta = manifest?.stages?.find((s) => Number(s.stage) === num);
            const chunkFile = stageMeta?.chunkFile || `ja_stage_${num}.json`;
            const res = await fetch(`/data/roadmap/${chunkFile}`);
            if (res && res.ok) {
                const json = await res.json();
                if (json && Array.isArray(json.lessons)) {
                    stageChunkCache.set(num, json);
                    return json;
                }
            }
        } catch (err) {
            console.warn(`[roadmapLoader] Failed to load stage ${num}:`, err?.message);
        } finally {
            stageChunkPromises.delete(num);
        }
        return normalizeLegacyStages().find((s) => Number(s.stage) === num) || null;
    })();

    stageChunkPromises.set(num, promise);
    return promise;
};

export const loadRoadmapLessonById = async (stageNum, lessonId) => {
    const stageData = await loadRoadmapStageChunk(stageNum);
    if (!stageData) return null;
    const lesson = (stageData.lessons || []).find((l) => l.id === lessonId);
    if (!lesson) return null;
    return { lesson, stage: stageData };
};
