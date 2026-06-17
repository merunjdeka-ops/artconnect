"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Tab = "email" | "phone";
type PhoneStep = "enter" | "verify";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceArtist = searchParams.get("role") === "artist";

  const [role, setRole] = useState<"client" | "artist">(forceArtist ? "artist" : "client");
  const [tab, setTab] = useState<Tab>("email");

  // Email fields
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // Phone fields
  const [phoneName, setPhoneName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetErrors() { setError(""); }

  // ── Email signup ──
  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    resetErrors();
    setLoading(true);
    try {
      const supabase = getSupabase();

      // Check if email already exists in profiles
      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("