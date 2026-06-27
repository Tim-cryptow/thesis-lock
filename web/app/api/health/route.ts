const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";

export function GET() {
  return Response.json(
    {
      status: "ok",
      contracts: {
        thesislock: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
        batch: `${CONTRACT_ADDRESS}.thesislock-batch`,
        registry: `${CONTRACT_ADDRESS}.thesislock-registry`,
      },
      version: "1.0.0",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
