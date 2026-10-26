"use client";
import {useEffect,useState} from "react";
import {medicalSubject,type SubjectReading} from "@/lib/medicalStudyLibrary";

export function useMedicalSubjectReading(subject:string){
 const [reading,setReading]=useState<SubjectReading|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;setReading(null);setLoading(true);const load=()=>{void medicalSubject(subject).then(value=>{if(live){setReading(value);setLoading(false);}}).catch(()=>{if(live)setLoading(false);});};load();window.addEventListener("medical-study-ready",load);return()=>{live=false;window.removeEventListener("medical-study-ready",load);};},[subject]);
 return {reading,loading};
}
