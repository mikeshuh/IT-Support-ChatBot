const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

async function listModels() {
    try {
        const models = await genAI.listModels();
        console.log("Available models:");
        for (const model of models) {
            console.log(`- ${model.name}`);
            console.log(`  Display Name: ${model.displayName}`);
            console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(", ")}`);
            console.log("");
        }
    } catch (error) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
