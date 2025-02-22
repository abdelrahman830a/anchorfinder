"use client";

import React, { useState } from "react";
import { AnchorTextData, ResultType } from "@/lib/types";

const AnchorFinder = () => {
  const [targetUrl, setTargetUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    if (!targetUrl.trim()) {
      setError("Please provide a valid Target URL.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl, topic }),
      });
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || `HTTP Error ${response.status}`);

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderAnchorTexts = () => {
    if (!result?.anchorTexts) return null;
    return (
      <div className="space-y-6">
        {Object.entries(result.anchorTexts).map(
          ([key, value]: [string, AnchorTextData]) => (
            <div
              key={key}
              className="border-2 border-gray-300 rounded-lg p-6 shadow-md hover:shadow-xl transition duration-500 ease-in-out">
              <h3 className="text-xl font-bold mb-2 capitalize">{key}</h3>
              <p>
                <strong>Text:</strong> {value.anchorText}
              </p>
              <p>
                <strong>Search Volume:</strong> {value.searchVolume} (monthly)
              </p>
              <p>
                <strong>Difficulty:</strong> {value.difficulty}
              </p>
              <p>
                <strong>Best For:</strong> {value.bestFor}
              </p>
            </div>
          )
        )}
      </div>
    );
  };

  const renderSEOMetrics = () => {
    if (!result?.metrics) return null;
    return (
      <div className="bg-gray-100 p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">SEO Metrics</h2>
        <p>
          <span className="font-bold">Refined Keyword Count:</span>{" "}
          {result.metrics.keywordCount}
        </p>
        {result.metrics.refinedKeywords?.length > 0 && (
          <div className="mt-2">
            <h3 className="font-semibold mb-2">
              High Search, Low Difficulty Keywords:
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              {result.metrics.refinedKeywords.map((kw: string, idx: number) => (
                <li key={idx}>{kw}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        SEO Anchor Text Finder
      </h1>
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="url"
            placeholder="Target URL (required)"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="border p-3 rounded w-full"
            required
          />
          <input
            type="text"
            placeholder="Topic / Niche (optional)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="border p-3 rounded w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded hover:bg-blue-700 transition duration-200">
          {loading ? "Generating..." : "Generate Anchor Text"}
        </button>
      </form>
      {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      {result && (
        <div className="mt-6 space-y-6">
          {renderAnchorTexts()}
          {renderSEOMetrics()}
        </div>
      )}
    </div>
  );
};

export default AnchorFinder;
