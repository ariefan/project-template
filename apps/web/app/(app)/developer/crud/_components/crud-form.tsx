"use client";

import {
	useMutation,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { ExamplePost, ExamplePostStatus } from "@workspace/contracts";
import {
	examplePostsCreateMutation,
	examplePostsUpdateMutation,
} from "@workspace/contracts/query";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
	type CompressedFileWithPreview,
	FileUploader,
	ImageUploader,
	type InitialUrl,
	type UploadFile,
} from "@workspace/ui/composed/file-upload";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { AlertCircle, CalendarIcon, File, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layouts/page-header";
import { apiClient, filesGet, getErrorMessage } from "@/lib/api-client";
import { authClient, useActiveOrganization, useSession } from "@/lib/auth";
import { env } from "@/lib/env";

// Helper to fetch file URL (standalone function for useQueries)
async function fetchFileUrl(fileId: string, orgId: string) {
	if (fileId.startsWith("file_picsum_")) {
		const id = fileId.replace("file_picsum_", "");
		return `https://picsum.photos/id/${id}/800/600`;
	}
	try {
		const { data, error } = await filesGet({
			client: apiClient,
			path: { orgId, fileId },
		});
		if (!error && data && "data" in data && data.data.url) {
			return data.data.url;
		}
		return null;
	} catch {
		return null;
	}
}

// Preview existing file (non-image) with remove button
function ExistingFilePreview({
	fileId,
	onRemove,
}: {
	fileId: string;
	onRemove: () => void;
}) {
	return (
		<div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
			<File className="size-4 shrink-0 text-muted-foreground" />
			<span className="min-w-0 flex-1 truncate text-sm">{fileId}</span>
			<Button
				className="size-6 shrink-0"
				onClick={onRemove}
				size="icon"
				type="button"
				variant="ghost"
			>
				<X className="size-3" />
			</Button>
		</div>
	);
}

interface CrudFormProps {
	post?: ExamplePost;
	mode: "create" | "edit";
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Form with many fields
export function CrudForm({ post, mode }: CrudFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { data: orgData } = useActiveOrganization();
	const { data: session } = useSession();
	const orgId = orgData?.id ?? "";
	const userId = session?.user?.id ?? "";

	// Basic Fields
	const [title, setTitle] = useState(post?.title ?? "");
	const [content, setContent] = useState(post?.content ?? "");
	const [authorId, setAuthorId] = useState(post?.authorId ?? "");
	const [status, setStatus] = useState<ExamplePostStatus>(
		post?.status ?? "draft",
	);

	// Extended Fields
	const [category, setCategory] = useState(post?.category ?? "");
	const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
	const [isFeatured, setIsFeatured] = useState(post?.isFeatured ?? false);
	const [publishDate, setPublishDate] = useState<Date | undefined>(
		post?.publishDate ? new Date(post.publishDate) : undefined,
	);

	// File Relations (IDs)
	const [coverImageId, setCoverImageId] = useState<string | undefined>(
		post?.coverImageId,
	);
	const [attachmentFileId, setAttachmentFileId] = useState<string | undefined>(
		post?.attachmentFileId,
	);
	const [galleryImageIds, setGalleryImageIds] = useState<string[]>(
		post?.galleryImageIds ?? [],
	);
	const [documentFileIds, setDocumentFileIds] = useState<string[]>(
		post?.documentFileIds ?? [],
	);

	const [error, setError] = useState<string | null>(null);

	// Fetch URLs for initial images (Cover)
	const { data: coverUrl } = useQuery({
		queryKey: ["file-url", coverImageId, orgId],
		queryFn: () => (coverImageId ? fetchFileUrl(coverImageId, orgId) : null),
		enabled: !!coverImageId && !!orgId,
		staleTime: 1000 * 60 * 60,
	});

	const coverInitialUrls: InitialUrl[] =
		coverImageId && coverUrl
			? [{ id: coverImageId, url: coverUrl, name: "Cover Image" }]
			: [];

	// Fetch URLs for initial images (Gallery)
	const galleryUrlResults = useQueries({
		queries: galleryImageIds.map((id) => ({
			queryKey: ["file-url", id, orgId],
			queryFn: () => fetchFileUrl(id, orgId),
			enabled: !!orgId,
			staleTime: 1000 * 60 * 60,
		})),
	});

	const galleryInitialUrls = galleryUrlResults
		.map((result, index) => {
			const id = galleryImageIds[index];
			if (result.data && id) {
				return {
					id,
					url: result.data,
					name: `Gallery Image ${index + 1}`,
				} satisfies InitialUrl;
			}
			return null;
		})
		.filter((item) => item !== null) as InitialUrl[];

	// Fetch organization members for author selection
	const { data: membersData } = useQuery({
		queryKey: ["organization-members", orgId],
		queryFn: async () => {
			const result = await authClient.organization.getFullOrganization({
				query: { organizationId: orgId },
			});
			return result;
		},
		enabled: Boolean(orgId),
	});

	// Deduplicate members by userId
	const members = Array.from(
		new Map(
			(
				(membersData?.data?.members ?? []) as Array<{
					userId: string;
					user?: { name?: string; email?: string };
				}>
			).map((member) => [member.userId, member]),
		).values(),
	);

	// Initialize author to current user on create
	useEffect(() => {
		if (mode === "create" && userId && !authorId) {
			setAuthorId(userId);
		}
	}, [mode, userId, authorId]);

	// Helper to upload a single file using XHR for progress
	const uploadFile = (
		file: File,
		onProgress?: (progress: number) => void,
	): Promise<{ id: string; url: string }> => {
		if (!orgId) {
			throw new Error("Organization ID missing");
		}

		const formData = new FormData();
		formData.append("file", file);

		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			if (onProgress) {
				xhr.upload.addEventListener("progress", (e) => {
					if (e.lengthComputable) {
						onProgress(Math.round((e.loaded / e.total) * 100));
					}
				});
			}

			xhr.addEventListener("load", () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					try {
						const response = JSON.parse(xhr.responseText);
						resolve({ id: response.id, url: response.url });
					} catch (_e) {
						reject(new Error("Invalid response from server"));
					}
				} else {
					reject(new Error("Upload failed"));
				}
			});

			xhr.addEventListener("error", () => reject(new Error("Network error")));
			xhr.open("POST", `${env.NEXT_PUBLIC_API_URL}/v1/orgs/${orgId}/files`);
			xhr.withCredentials = true;
			xhr.send(formData);
		});
	};

	// Handlers for ImageUploader (Cover)
	const handleCoverUpload = async (files: CompressedFileWithPreview[]) => {
		if (files.length === 0) {
			return;
		}
		const file = files[0];
		if (!file) {
			return;
		}
		try {
			const { id } = await uploadFile(file);
			setCoverImageId(id);
			toast.success("Cover image uploaded");
		} catch (_e) {
			toast.error("Failed to upload cover image");
		}
	};

	// Handlers for ImageUploader (Gallery)
	const handleGalleryUpload = async (files: CompressedFileWithPreview[]) => {
		const newIds: string[] = [];
		for (const file of files) {
			try {
				const { id } = await uploadFile(file);
				newIds.push(id);
			} catch (e) {
				console.error(e);
			}
		}
		if (newIds.length > 0) {
			setGalleryImageIds((prev) => [...prev, ...newIds]);
			toast.success(`Uploaded ${newIds.length} gallery images`);
		}
	};

	// Handlers for FileUploader (Attachment)
	const handleAttachmentUpload = async (
		fileState: UploadFile,
		onProgress: (p: number) => void,
	): Promise<string | undefined> => {
		const { id } = await uploadFile(fileState.file, onProgress);
		setAttachmentFileId(id);
		return id;
	};

	// Handlers for FileUploader (Documents)
	const handleDocumentUpload = async (
		fileState: UploadFile,
		onProgress: (p: number) => void,
	): Promise<string | undefined> => {
		const { id } = await uploadFile(fileState.file, onProgress);
		setDocumentFileIds((prev) => [...prev, id]);
		return id;
	};

	const createMutation = useMutation({
		...examplePostsCreateMutation({ client: apiClient }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey[0] as { _id: string } | undefined;
					return key?._id === "examplePostsList";
				},
			});
			toast.success("Post created successfully");
			router.push("/developer/crud");
		},
		onError: (err) => {
			setError(getErrorMessage(err));
		},
	});

	const updateMutation = useMutation({
		...examplePostsUpdateMutation({ client: apiClient }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate: (query) => {
					const key = query.queryKey[0] as { _id: string } | undefined;
					return (
						key?._id === "examplePostsList" || key?._id === "examplePostsGet"
					);
				},
			});
			toast.success("Post updated successfully");
			router.push(`/developer/crud/${post?.id}`);
		},
		onError: (err) => {
			setError(getErrorMessage(err));
		},
	});

	const isLoading = createMutation.isPending || updateMutation.isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!title.trim()) {
			setError("Title is required");
			return;
		}

		if (!content.trim()) {
			setError("Content is required");
			return;
		}

		if (!authorId) {
			setError("Author is required");
			return;
		}

		const parsedTags = tags
			.split(",")
			.map((t: string) => t.trim())
			.filter(Boolean);

		const payload = {
			title,
			content,
			status,
			category: category || undefined,
			tags: parsedTags,
			isFeatured,
			publishDate: publishDate?.toISOString(),
			coverImageId: coverImageId || undefined,
			attachmentFileId: attachmentFileId || undefined,
			galleryImageIds,
			documentFileIds,
		};

		if (mode === "create") {
			createMutation.mutate({
				path: { orgId },
				body: { ...payload, authorId },
			});
		} else if (post) {
			updateMutation.mutate({
				path: { orgId, id: post.id },
				body: payload,
			});
		}
	}

	return (
		<div className="container mx-auto max-w-7xl p-4">
			<PageHeader
				backHref="/developer/crud"
				backLabel="Back to Posts"
				description={
					mode === "create"
						? "Fill in the details below to create a new post."
						: "Update the post details below."
				}
				title={mode === "create" ? "Create Post" : "Edit Post"}
				variant="compact"
			/>

			<Card>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							{error && (
								<div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
									<AlertCircle className="size-4 shrink-0" />
									{error}
								</div>
							)}

							{/* Basic Information */}
							<FieldSet>
								<FieldLegend>Basic Information</FieldLegend>
								<FieldDescription>
									Core details about your post.
								</FieldDescription>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="title">Title</FieldLabel>
										<Input
											disabled={isLoading}
											id="title"
											onChange={(e) => setTitle(e.target.value)}
											placeholder="Enter post title"
											value={title}
										/>
									</Field>

									<Field>
										<FieldLabel htmlFor="content">Content</FieldLabel>
										<Textarea
											className="min-h-[150px]"
											disabled={isLoading}
											id="content"
											onChange={(e) => setContent(e.target.value)}
											placeholder="Write your post content (Markdown supported)"
											value={content}
										/>
									</Field>

									<Field>
										<FieldLabel htmlFor="author">Author</FieldLabel>
										<Select
											disabled={isLoading || mode === "edit"}
											onValueChange={setAuthorId}
											value={authorId}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select author" />
											</SelectTrigger>
											<SelectContent>
												{members.map((member) => (
													<SelectItem key={member.userId} value={member.userId}>
														{member.user?.name ??
															member.user?.email ??
															member.userId}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{mode === "edit" && (
											<FieldDescription>
												Author cannot be changed after creation.
											</FieldDescription>
										)}
									</Field>
								</FieldGroup>
							</FieldSet>

							{/* Publishing */}
							<FieldSet>
								<FieldLegend>Publishing</FieldLegend>
								<FieldDescription>
									Control when and how your post appears.
								</FieldDescription>
								<FieldGroup>
									<div className="grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="status">Status</FieldLabel>
											<Select
												disabled={isLoading}
												onValueChange={(value) =>
													setStatus(value as ExamplePostStatus)
												}
												value={status}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select status" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="draft">Draft</SelectItem>
													<SelectItem value="published">Published</SelectItem>
													<SelectItem value="archived">Archived</SelectItem>
												</SelectContent>
											</Select>
										</Field>

										<Field>
											<FieldLabel>Publish Date</FieldLabel>
											<Popover>
												<PopoverTrigger asChild>
													<Button
														className={cn(
															"w-full justify-start text-left font-normal",
															!publishDate && "text-muted-foreground",
														)}
														variant="outline"
													>
														<CalendarIcon className="mr-2 h-4 w-4" />
														{publishDate ? (
															format(publishDate, "PPP")
														) : (
															<span>Pick a date</span>
														)}
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0">
													<Calendar
														initialFocus
														mode="single"
														onSelect={setPublishDate}
														selected={publishDate}
													/>
												</PopoverContent>
											</Popover>
										</Field>
									</div>

									<Field orientation="horizontal">
										<Switch
											checked={isFeatured}
											id="featured"
											onCheckedChange={setIsFeatured}
										/>
										<FieldLabel htmlFor="featured">
											Feature this post
										</FieldLabel>
									</Field>
								</FieldGroup>
							</FieldSet>

							{/* Categorization */}
							<FieldSet>
								<FieldLegend>Categorization</FieldLegend>
								<FieldDescription>
									Organize your post with categories and tags.
								</FieldDescription>
								<FieldGroup>
									<div className="grid gap-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor="category">Category</FieldLabel>
											<Input
												disabled={isLoading}
												id="category"
												onChange={(e) => setCategory(e.target.value)}
												placeholder="e.g. Technology, Lifestyle"
												value={category}
											/>
										</Field>

										<Field>
											<FieldLabel htmlFor="tags">Tags</FieldLabel>
											<Input
												disabled={isLoading}
												id="tags"
												onChange={(e) => setTags(e.target.value)}
												placeholder="react, typescript, api"
												value={tags}
											/>
											<FieldDescription>
												Separate multiple tags with commas.
											</FieldDescription>
										</Field>
									</div>
								</FieldGroup>
							</FieldSet>

							{/* Media */}
							<FieldSet>
								<FieldLegend>Media</FieldLegend>
								<FieldDescription>
									Add images and files to your post.
								</FieldDescription>
								<FieldGroup>
									<div className="grid gap-6 md:grid-cols-2">
										<Field>
											<FieldLabel>Cover Image</FieldLabel>
											<ImageUploader
												autoUpload
												defaultOptions={{
													maxSizeMB: 1,
													maxWidthOrHeight: 1200,
												}}
												enableCropping
												initialUrls={coverInitialUrls}
												layout="carousel"
												onConfirm={handleCoverUpload}
												onRemoveUrl={() => setCoverImageId(undefined)}
												showCompressionOptions={false}
												showConfirmButton={false}
											/>
										</Field>

										<Field>
											<FieldLabel>Attachment</FieldLabel>
											{attachmentFileId ? (
												<ExistingFilePreview
													fileId={attachmentFileId}
													onRemove={() => setAttachmentFileId(undefined)}
												/>
											) : (
												<>
													<FileUploader
														autoUpload
														maxFiles={1}
														onUpload={handleAttachmentUpload}
													/>
													<FieldDescription>
														Single file attachment (PDF, ZIP, etc.)
													</FieldDescription>
												</>
											)}
										</Field>
									</div>

									<div className="grid gap-6 md:grid-cols-2">
										<Field>
											<FieldLabel>Gallery Images</FieldLabel>
											<ImageUploader
												autoUpload
												defaultOptions={{
													maxSizeMB: 1,
													maxWidthOrHeight: 1200,
												}}
												enableCropping={false}
												initialUrls={galleryInitialUrls}
												onConfirm={handleGalleryUpload}
												onRemoveUrl={(id) =>
													setGalleryImageIds((prev) =>
														prev.filter((i) => i !== id),
													)
												}
												showCompressionOptions={false}
												showConfirmButton={false}
											/>
										</Field>

										<Field>
											<FieldLabel>Documents</FieldLabel>
											{documentFileIds.length > 0 && (
												<div className="mb-2 space-y-1">
													{documentFileIds.map((id) => (
														<ExistingFilePreview
															fileId={id}
															key={id}
															onRemove={() =>
																setDocumentFileIds((prev) =>
																	prev.filter((i) => i !== id),
																)
															}
														/>
													))}
												</div>
											)}
											<FileUploader
												autoUpload
												maxFiles={10}
												onUpload={handleDocumentUpload}
											/>
											<FieldDescription>
												Multiple documents allowed.
											</FieldDescription>
										</Field>
									</div>
								</FieldGroup>
							</FieldSet>

							{/* Actions */}
							<div className="flex gap-4 pt-4">
								<Button disabled={isLoading} type="submit">
									{isLoading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{mode === "create" ? "Create Post" : "Save Changes"}
								</Button>
								<Button
									asChild
									disabled={isLoading}
									type="button"
									variant="outline"
								>
									<Link href="/developer/crud">Cancel</Link>
								</Button>
							</div>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
