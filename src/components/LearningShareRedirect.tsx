'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
export default function LearningShareRedirect(){const router=useRouter();useEffect(()=>{router.replace('/share-code/');},[router]);return <p style={{padding:24}}><Link href="/share-code/">打开学习分享码</Link></p>;}
