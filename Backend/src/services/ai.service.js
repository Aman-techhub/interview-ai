const Groq = require("groq-sdk");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


const interviewReportSchema = z.object({

    matchScore: z.number()
        .describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),

    technicalQuestions: z.array(
        z.object({
            question: z.string()
                .describe("The technical question that can be asked in the interview"),

            intention: z.string()
                .describe("The intention of the interviewer behind asking this question"),

            answer: z.string()
                .describe("How to answer this question, what points to cover, and what approach to take")
        })
    ),

    behavioralQuestions: z.array(
        z.object({
            question: z.string()
                .describe("The behavioral question that can be asked in the interview"),

            intention: z.string()
                .describe("The intention of the interviewer behind asking this question"),

            answer: z.string()
                .describe("How to answer this question, what points to cover, and what approach to take")
        })
    ),

    skillGaps: z.array(
        z.object({
            skill: z.string()
                .describe("The skill which the candidate is lacking"),

            severity: z.enum([
                "low",
                "medium",
                "high"
            ])
        })
    ),

    preparationPlan: z.array(
        z.object({
            day: z.number(),

            focus: z.string(),

            tasks: z.array(
                z.string()
            )
        })
    ),

    title: z.string()
});


async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    const prompt = `
Generate an interview report for a candidate.

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

Return only valid JSON matching the provided schema.
`;

    try {

        const completion = await groq.chat.completions.create({

            model: "openai/gpt-oss-120b",

            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert AI interview assistant. Generate accurate, structured interview reports."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],

            response_format: {
                type: "json_schema",

                json_schema: {
                    name: "interview_report",
                    strict: true,
                    schema: zodToJsonSchema(
                        interviewReportSchema
                    )
                }
            },

            temperature: 0.7,
            max_completion_tokens: 5000
        });


        const content =
            completion.choices[0]?.message?.content;


        if (!content) {
            throw new Error(
                "Groq returned an empty response."
            );
        }


        const result =
            JSON.parse(content);


        const validatedResult =
            interviewReportSchema.parse(result);


        return validatedResult;


    } catch (error) {

        console.error(
            "Error generating interview report:",
            error
        );

        throw error;
    }
}


async function generatePdfFromHtml(htmlContent) {

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.setContent(
        htmlContent,
        {
            waitUntil: "networkidle0"
        }
    );

    const pdfBuffer = await page.pdf({

        format: "A4",

        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }

    });

    await browser.close();

    return pdfBuffer;
}


async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    const resumePdfSchema = z.object({

        html: z.string()
            .describe(
                "The HTML content of the resume which can be converted to PDF using Puppeteer"
            )

    });


    const prompt = `
Generate a professional resume for a candidate.

Resume:
${resume}

Self Description:
${selfDescription}

Job Description:
${jobDescription}

The response should contain HTML content for the resume.

The resume should:

- Be tailored to the job description.
- Highlight relevant skills and experience.
- Be ATS friendly.
- Be professional.
- Be concise.
- Be 1-2 pages when converted to PDF.
- Use clean HTML and CSS.
- Not sound obviously AI-generated.
`;


    const completion =
        await groq.chat.completions.create({

            model: "openai/gpt-oss-120b",

            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert professional resume generator."
                },

                {
                    role: "user",
                    content: prompt
                }
            ],

            response_format: {

                type: "json_schema",

                json_schema: {

                    name: "resume_html",

                    strict: true,

                    schema:
                        zodToJsonSchema(
                            resumePdfSchema
                        )
                }
            },

            temperature: 0.7,

            max_completion_tokens: 6000
        });


    const content =
        completion.choices[0]?.message?.content;


    if (!content) {

        throw new Error(
            "Groq returned an empty response."
        );

    }


    const jsonContent =
        JSON.parse(content);


    const validatedContent =
        resumePdfSchema.parse(
            jsonContent
        );


    const pdfBuffer =
        await generatePdfFromHtml(
            validatedContent.html
        );


    return pdfBuffer;
}


module.exports = {
    generateInterviewReport,
    generateResumePdf
};