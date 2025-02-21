"use client";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ResultType, AnchorTextsResult } from "@/lib/types";

const AnchorFinder = () => {
  const [targetUrl, setTargetUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl, topic }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || `HTTP Error ${response.status}`);
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Render the anchor texts in a pleasant, card-based layout.
  const renderAnchorTexts = () => {
    if (!result?.anchorTexts) return null;
    if (typeof result.anchorTexts === "string") {
      return <ReactMarkdown>{result.anchorTexts}</ReactMarkdown>;
    }
    const { primary, alternatives } = result.anchorTexts as AnchorTextsResult;
    return (
      <div className="space-y-6">
        {primary && (
          <div className="border rounded p-4 bg-white shadow">
            <h3 className="text-xl font-bold mb-2">Primary Anchor Text</h3>
            <p>
              <span className="font-semibold">Text:</span> {primary.text}
            </p>
            <p>
              <span className="font-semibold">Search Volume:</span>{" "}
              {primary.searchVolume}
            </p>
            <p>
              <span className="font-semibold">Difficulty:</span>{" "}
              {primary.difficulty}
            </p>
          </div>
        )}
        {alternatives && alternatives.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-2">Alternative Anchor Texts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alternatives.map((alt, index) => (
                <div key={index} className="border rounded p-4 bg-white shadow">
                  <p className="text-sm text-gray-500">Type: {alt.type}</p>
                  <p className="font-semibold">Text: {alt.text}</p>
                  <p className="text-sm">
                    <span className="font-semibold">Search Volume:</span>{" "}
                    {alt.searchVolume}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Difficulty:</span>{" "}
                    {alt.difficulty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-center mb-6">
        SEO Anchor Text Finder
      </h1>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Target URL (Required)"
          className="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic/Niche (Optional)"
          className="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <button
        onClick={handleGenerate}
        className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition duration-200">
        {loading ? "Generating..." : "Generate Anchor Text"}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {result && (
        <div className="mt-8 space-y-6">
          <div className="bg-gray-100 p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">Anchor Text Suggestions</h2>
            {renderAnchorTexts()}
          </div>
          <div className="bg-gray-100 p-6 rounded shadow">
            <h2 className="text-2xl font-bold mb-4">SEO Metrics</h2>
            <p className="text-lg">
              <span className="font-semibold">Keyword Count:</span>{" "}
              {result.metrics.keywordCount}
            </p>
            {result.metrics.refinedKeywords &&
              result.metrics.refinedKeywords.length > 0 && (
                <div className="mt-2">
                  <h3 className="font-semibold mb-1">Refined Keywords:</h3>
                  <ul className="list-disc list-inside">
                    {result.metrics.refinedKeywords.map(
                      (kw: string, idx: number) => (
                        <li key={idx}>{kw}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnchorFinder;
