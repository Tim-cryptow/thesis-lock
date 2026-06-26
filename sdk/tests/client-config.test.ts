import { describe, expect, it } from "vitest";
import { ThesisLockClient, createClient } from "../src/index";

const DEFAULT_ADDRESS = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

describe("client configuration", () => {
  it("defaults to the mainnet API URL and contract address", () => {
    const client = createClient();
    expect(client.network).toBe("mainnet");
    expect(client.apiUrl).toBe("https://api.mainnet.hiro.so");
    expect(client.contractAddress).toBe(DEFAULT_ADDRESS);
  });

  it("uses the testnet API URL for the testnet network", () => {
    const client = createClient({ network: "testnet" });
    expect(client.network).toBe("testnet");
    expect(client.apiUrl).toBe("https://api.testnet.hiro.so");
  });

  it("lets an explicit apiUrl override the network default", () => {
    expect(createClient({ apiUrl: "https://example.test" }).apiUrl).toBe(
      "https://example.test",
    );
  });

  it("strips a trailing slash from the apiUrl", () => {
    expect(createClient({ apiUrl: "https://example.test/" }).apiUrl).toBe(
      "https://example.test",
    );
  });

  it("lets a custom contractAddress override the default", () => {
    const address = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    expect(createClient({ contractAddress: address }).contractAddress).toBe(
      address,
    );
  });

  it("constructs directly with new ThesisLockClient", () => {
    const client = new ThesisLockClient({ network: "testnet" });
    expect(client).toBeInstanceOf(ThesisLockClient);
    expect(client.apiUrl).toBe("https://api.testnet.hiro.so");
  });
});
