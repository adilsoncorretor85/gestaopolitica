/**
 * Imports otimizados para reduzir o tamanho do bundle
 * Usa tree shaking para importar apenas o que é necessário
 */

// React - imports específicos
export { useState, useEffect, useCallback, useMemo, useRef } from 'react';
export type { ReactNode, ComponentType } from 'react';

// React Router - imports específicos
export { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';

// React Hook Form - imports específicos
export { useForm, Controller } from 'react-hook-form';
export type { UseFormReturn, FieldValues } from 'react-hook-form';

// Supabase - imports específicos
export { createClient } from '@supabase/supabase-js';
export type { SupabaseClient, User, Session } from '@supabase/supabase-js';

// Lucide React - imports específicos (evita importar toda a biblioteca)
export { 
  User, 
  Users, 
  MapPin, 
  Calendar, 
  Settings, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Menu,
  X as Close,
  Home,
  BarChart3,
  Target,
  Mail,
  Phone,
  Map,
  Clock,
  Tag,
  UserPlus,
  Shield,
  Lock,
  Unlock,
  RefreshCw,
  Save,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Heart,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Globe,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Signal,
  SignalHigh,
  SignalLow,
  SignalZero,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Monitor,
  Palette,
  Layers,
  Database,
  Server,
  Cloud,
  CloudOff,
  Download as DownloadIcon,
  Upload as UploadIcon,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  FolderOpen,
  File,
  FileCheck,
  FileX,
  FilePlus,
  FileMinus,
  FileEdit,
  FileSearch,
  FileCode,
  FileJson,
  FilePdf,
  FileWord,
  FileExcel,
  FilePowerpoint,
  FileZip,
  FileAudio,
  FileVideo,
  FileImage,
  FileType,
  FileSize,
  FileDate,
  FileUser,
  FileLock,
  FileUnlock,
  FileShield,
  FileWarning,
  FileAlert,
  FileInfo,
  FileQuestion,
  FileHeart,
  FileStar,
  FileBookmark,
  FileBookmarkCheck,
  FileBookmarkX,
  FileBookmarkPlus,
  FileBookmarkMinus,
  FileBookmarkEdit,
  FileBookmarkSearch,
  FileBookmarkCode,
  FileBookmarkJson,
  FileBookmarkPdf,
  FileBookmarkWord,
  FileBookmarkExcel,
  FileBookmarkPowerpoint,
  FileBookmarkZip,
  FileBookmarkAudio,
  FileBookmarkVideo,
  FileBookmarkImage,
  FileBookmarkType,
  FileBookmarkSize,
  FileBookmarkDate,
  FileBookmarkUser,
  FileBookmarkLock,
  FileBookmarkUnlock,
  FileBookmarkShield,
  FileBookmarkWarning,
  FileBookmarkAlert,
  FileBookmarkInfo,
  FileBookmarkQuestion,
  FileBookmarkHeart,
  FileBookmarkStar
} from 'lucide-react';

// Date-fns - imports específicos
export { format, parseISO, isValid, differenceInDays, addDays, subDays } from 'date-fns';
export { ptBR } from 'date-fns/locale';

// Zod - imports específicos
export { z } from 'zod';

// Class Variance Authority - imports específicos
export { cva } from 'class-variance-authority';

// Clsx - imports específicos
export { clsx } from 'clsx';

// Tailwind Merge - imports específicos
export { twMerge } from 'tailwind-merge';

// Utils - função combinada para clsx e twMerge
export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

// Framer Motion - imports específicos (apenas animações básicas)
export { motion, AnimatePresence } from 'framer-motion';

// React Query - imports específicos
export { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// React Table - imports específicos
export { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel } from '@tanstack/react-table';

// React Window - imports específicos
export { FixedSizeList as List, VariableSizeList } from 'react-window';

// React Window Infinite Loader - imports específicos
export { InfiniteLoader } from 'react-window-infinite-loader';

// Recharts - imports específicos
export { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

// Google Maps - imports específicos
export { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

// Zustand - imports específicos
export { create } from 'zustand';

// Pako - imports específicos (para compressão)
export { deflate, inflate } from 'pako';

// Sentry - imports específicos
export { captureException, captureMessage } from '@sentry/react';

// Vercel Analytics - imports específicos
export { Analytics } from '@vercel/analytics/react';

// Hookform Resolvers - imports específicos
export { zodResolver } from '@hookform/resolvers/zod';

// Radix UI - imports específicos
export { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@radix-ui/react-dropdown-menu';

export { 
  Label,
  LabelRoot,
  LabelText
} from '@radix-ui/react-label';

export { Slot } from '@radix-ui/react-slot';

// Google Maps JS API Loader - imports específicos
export { Loader } from '@googlemaps/js-api-loader';

// Google Maps Marker Clusterer - imports específicos
export { MarkerClusterer } from '@googlemaps/markerclusterer';

// Testing Library - imports específicos (apenas para desenvolvimento)
export { 
  render, 
  screen, 
  fireEvent, 
  waitFor, 
  act,
  cleanup,
  renderHook,
  act as actHook
} from '@testing-library/react';

export { userEvent } from '@testing-library/user-event';

export * from '@testing-library/jest-dom';
