import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { env } from "../config/env.js";
import type { CollectedInfo, AIResponseOptions, AIResponseResult } from "../types/index.js";

// ─── Mistral Provider ────────────────────────────────────────────────────────

const mistral = createMistral({
    apiKey: env.MISTRAL_API_KEY,
});

// ─── System Prompt ───────────────────────────────────────────────────────────

const RECEPTIONIST_SYSTEM_PROMPT =
    env.SYSTEM_PROMPT ||
    `Eres un asistente de recepción virtual para JAdmin. Tu ÚNICO objetivo es recopilar información del visitante de manera amable y profesional.

## REGLAS DE ORO (ESTRICTAS)
1. Responde SIEMPRE en español.
2. Sé conciso (máximo 2-3 oraciones por respuesta).
3. NO des información técnica ni soluciones bajo ninguna circunstancia.
4. Si el usuario se frustra o muestra urgencia, añade exactamente al final de tu respuesta: [NEEDS_HUMAN]
5. Mantén un tono cálido, profesional y natural. NO uses listas ni bullets en tus respuestas.
6. NO repitas preguntas si ya tienes la información o si acabas de preguntar lo mismo.
7. PROHIBIDO preguntar "¿Hay algo más?" o "¿En qué más puedo ayudarte?". Una vez que tengas el motivo (o tras un par de intentos), despídete indicando que un agente revisará el caso. NO abras la puerta a más preguntas.

## INFORMACIÓN A RECOPILAR (en orden de prioridad)
1. **Nombre completo** - Cómo se llama el visitante.
2. **Correo electrónico** - Para dar seguimiento.
3. **Motivo de la consulta** - Un breve resumen de por qué contactan.

## FLUJO DE CONVERSACIÓN
### Si NO tienes el NOMBRE:
- Saluda amablemente y pregunta por su nombre.

### Si tienes NOMBRE pero NO tienes EMAIL:
- Agradece y usa su nombre. Pídele su correo electrónico para que un técnico pueda contactarle.

### Si tienes NOMBRE y EMAIL pero NO tienes MOTIVO:
- Agradece y pregunta brevemente el motivo de su consulta.

### Si tienes los 3 DATOS válidos (nombre, email y motivo) O si el usuario ya explicó su problema:
- Agradece, indica que hemos recibido la información y dile que un agente humano revisará su caso pronto.
- Despídete. NO preguntes si necesitan algo más.`;

// ─── Info Extraction ─────────────────────────────────────────────────────────

function extractInfoFromMessage(
    message: string,
    currentInfo: CollectedInfo,
): CollectedInfo {
    const extracted: CollectedInfo = { ...currentInfo };

    // Email
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/i;
    const emailMatch = message.match(emailRegex);
    if (emailMatch) {
        extracted.email = emailMatch[0].toLowerCase();
    }

    // Phone (various formats)
    const phoneRegex =
        /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
    const phoneMatch = message.match(phoneRegex);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 8) {
        extracted.phone = phoneMatch[0];
    }

    // Name patterns
    const namePatterns = [
        /(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i,
        /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)$/,
    ];

    for (const pattern of namePatterns) {
        const match = message.match(pattern);
        if (match?.[1] && !currentInfo.name) {
            extracted.name = match[1].trim();
            break;
        }
    }

    return extracted;
}

// ─── Build System Context ────────────────────────────────────────────────────

function buildSystemContext(info: CollectedInfo): string {
    let context = RECEPTIONIST_SYSTEM_PROMPT;

    context += `\n\n## ESTADO ACTUAL DE RECOPILACIÓN`;
    context += `\n - Nombre: ${info.name || "❌ NO recopilado"}`;
    context += `\n - Email: ${info.email || "❌ NO recopilado"}`;
    context += `\n - Motivo: ${info.reason || "❌ NO recopilado"}`;

    if (info.name && info.email && info.reason) {
        context +=
            `\n\n✅ TIENES TODA LA INFORMACIÓN. Despídete indicando que hemos recibido la consulta y un agente contactará pronto. NO preguntes si necesitan algo más. TERMINA LA CONVERSACIÓN AQUÍ.`;
    }

    return context;
}

// ─── Main AI Response ────────────────────────────────────────────────────────

export async function generateAIResponse(
    messages: { role: "user" | "assistant"; content: string }[],
    options?: AIResponseOptions,
): Promise<AIResponseResult> {
    const currentInfo = options?.collectedInfo || {};

    // Extract info from latest user message
    const lastUserMessage =
        messages.findLast((m) => m.role === "user")?.content || "";
    const extractedInfo = extractInfoFromMessage(lastUserMessage, currentInfo);

    // Capture reason if message looks like an explanation
    const hasReason = !!(extractedInfo.reason || currentInfo.reason);
    if (!hasReason && lastUserMessage.length > 5 && !lastUserMessage.includes("@")) {
        const looksLikeOnlyName =
            /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?$/.test(
                lastUserMessage.trim(),
            );
        if (!looksLikeOnlyName) {
            extractedInfo.reason = lastUserMessage;
        }
    }

    const systemContext = buildSystemContext(extractedInfo);

    // Call Mistral AI
    if (env.MISTRAL_API_KEY) {
        try {
            const { text } = await generateText({
                model: mistral(env.MISTRAL_MODEL),
                system: systemContext,
                messages,
                maxTokens: 300,
                temperature: 0.7,
            });

            const needsHuman = text.includes("[NEEDS_HUMAN]");
            const cleanResponse = text.replace("[NEEDS_HUMAN]", "").trim();

            return {
                response:
                    cleanResponse ||
                    "Gracias por tu mensaje. Un agente te contactará pronto.",
                needsHuman,
                extractedInfo: {
                    name: extractedInfo.name || currentInfo.name,
                    email: extractedInfo.email || currentInfo.email,
                    reason: extractedInfo.reason || currentInfo.reason,
                    phone: extractedInfo.phone || currentInfo.phone,
                },
            };
        } catch (error) {
            console.error("[ai] Mistral error:", error);
        }
    }

    // Fallback when no API key
    return {
        response:
            "Gracias por contactarnos. Tu mensaje ha sido registrado y un agente te contactará lo antes posible.",
        needsHuman: true,
        extractedInfo,
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isInfoComplete(info: CollectedInfo): boolean {
    return !!(info.name && info.email && info.reason);
}
