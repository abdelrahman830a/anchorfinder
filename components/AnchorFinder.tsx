"use client";
import { ResultType, AnchorTextsResult } from "@/lib/types";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

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
    } finally {
      setLoading(false);
    }
  };

  // Renders anchor text suggestions based on the returned structure.
  const renderAnchorTexts = () => {
    // If the API returned plain text, render it as Markdown.
    if (typeof result?.anchorTexts === "string") {
      return <ReactMarkdown>{result.anchorTexts}</ReactMarkdown>;
    } else if (result?.anchorTexts) {
      const anchorData = result.anchorTexts as AnchorTextsResult;
      return (
        <div className="space-y-6">
          {anchorData.primary && (
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Recommended Primary Anchor Text
              </h3>
              <div className="border p-4 rounded bg-white">
                <p>
                  <strong>Text:</strong> {anchorData.primary.text}
                </p>
                <p>
                  <strong>Search Volume:</strong>{" "}
                  {anchorData.primary.searchVolume}
                </p>
                <p>
                  <strong>Difficulty:</strong> {anchorData.primary.difficulty}
                </p>
              </div>
            </div>
          )}
          {anchorData.alternatives && anchorData.alternatives.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Alternative Anchor Texts
              </h3>
              <div className="space-y-4">
                {anchorData.alternatives.map((alt, index) => (
                  <div key={index} className="border p-4 rounded bg-white">
                    <p>
                      <strong>Type:</strong> {alt.type}
                    </p>
                    <p>
                      <strong>Text:</strong> {alt.text}
                    </p>
                    <p>
                      <strong>Search Volume:</strong> {alt.searchVolume}
                    </p>
                    <p>
                      <strong>Difficulty:</strong> {alt.difficulty}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">
        SEO Anchor Text Finder
      </h1>
      <div className="flex flex-col md:flex-row md:space-x-4 mb-4">
        <input
          type="text"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Target URL (Required)"
          className="flex-1 border border-gray-300 rounded px-4 py-2 mb-4 md:mb-0 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mb-4 transition duration-200">
        {loading ? "Generating..." : "Generate Anchor Text"}
      </button>
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      {result && (
        <div className="mt-8 bg-gray-100 p-6 rounded shadow">
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <div>{renderAnchorTexts()}</div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">SEO Metrics</h3>
            <p>
              <strong>Keyword Count:</strong> {result.metrics.keywordCount}
            </p>
            {/* Add any additional metrics here */}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnchorFinder;
