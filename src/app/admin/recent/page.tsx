"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Cropper from "react-easy-crop";

interface RecentSlot {
  imageFile: File | null;
  uploadedImageUrl: string;
  title: string;
  description: string;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: any;
  isCropping: boolean;
}

export default function RecentPage() {
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [slots, setSlots] = useState<RecentSlot[]>([
    { imageFile: null, uploadedImageUrl: "", title: "", description: "", crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, isCropping: false },
    { imageFile: null, uploadedImageUrl: "", title: "", description: "", crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, isCropping: false },
    { imageFile: null, uploadedImageUrl: "", title: "", description: "", crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, isCropping: false },
    { imageFile: null, uploadedImageUrl: "", title: "", description: "", crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, isCropping: false },
  ]);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [currentCropIndex, setCurrentCropIndex] = useState<number | null>(null);

  useEffect(() => {
    loadRecentImages();
  }, []);

  const loadRecentImages = async () => {
    try {
      const res = await axios.get("/api/admin/recent");
      if (res.data.success) {
        setUploadedImages(res.data.data);
        // Populate slots with existing data
        const newSlots = [...slots];
        res.data.data.forEach((item: any) => {
          const slotIndex = item.order - 1;
          if (slotIndex >= 0 && slotIndex < 4) {
            newSlots[slotIndex] = {
              ...newSlots[slotIndex],
              uploadedImageUrl: item.image,
              title: item.title,
              description: item.description || '',
              isCropping: false,
            };
          }
        });
        setSlots(newSlots);
      }
    } catch (error) {
      console.error("Failed to load recent images:", error);
    }
  };

  const handleImageSelect = (index: number, file: File) => {
    console.log("Image selected for slot", index, "file:", file.name);
    const newSlots = [...slots];
    newSlots[index].imageFile = file;
    newSlots[index].isCropping = false; // Reset cropping state
    setSlots(newSlots);
    setCurrentCropIndex(index);
    setCropDialogOpen(true); // Auto-open crop dialog
    console.log("Crop dialog opened automatically for slot", index);
  };

  const onCropChange = (index: number, crop: { x: number; y: number }) => {
    const newSlots = [...slots];
    newSlots[index].crop = crop;
    setSlots(newSlots);
  };

  const onZoomChange = (index: number, zoom: number) => {
    const newSlots = [...slots];
    newSlots[index].zoom = zoom;
    setSlots(newSlots);
  };

  const onCropComplete = (index: number, croppedArea: any, croppedAreaPixels: any) => {
    const newSlots = [...slots];
    newSlots[index].croppedAreaPixels = croppedAreaPixels;
    setSlots(newSlots);
  };

  const applyCrop = async (index: number) => {
    const slot = slots[index];
    if (!slot.imageFile || !slot.croppedAreaPixels) {
      toast.error("Please select an image and crop area first");
      return;
    }

    console.log("Applying crop for slot", index);
    console.log("Cropped area pixels:", slot.croppedAreaPixels);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = URL.createObjectURL(slot.imageFile);

    img.onload = () => {
      console.log("Image loaded, dimensions:", img.width, img.height);
      canvas.width = slot.croppedAreaPixels.width;
      canvas.height = slot.croppedAreaPixels.height;
      ctx?.drawImage(
        img,
        slot.croppedAreaPixels.x,
        slot.croppedAreaPixels.y,
        slot.croppedAreaPixels.width,
        slot.croppedAreaPixels.height,
        0,
        0,
        slot.croppedAreaPixels.width,
        slot.croppedAreaPixels.height
      );

      canvas.toBlob(async (blob) => {
        if (blob) {
          console.log("Blob created, size:", blob.size);
          const croppedFile = new File([blob], slot.imageFile!.name, { type: blob.type });
          // Upload to AWS S3
          const formData = new FormData();
          formData.append("my_file", croppedFile);
          try {
            console.log("Uploading to:", "/api/admin/product/upload-image");
            const response = await axios.post("/api/admin/product/upload-image", formData);
            console.log("Upload response:", response.data);
            if (response.data.success) {
              console.log("Setting uploadedImageUrl to:", response.data.result.url);
              const newSlots = [...slots];
              newSlots[index].uploadedImageUrl = response.data.result.url;
              newSlots[index].isCropping = false;
              setSlots(newSlots);
              setCropDialogOpen(false);
              setCurrentCropIndex(null);
              toast.success("Image cropped and uploaded successfully!");
              console.log("Slot updated, uploadedImageUrl:", newSlots[index].uploadedImageUrl);
            }
          } catch (error) {
            console.error("Upload error:", error);
            toast.error("Failed to upload image");
          }
        } else {
          console.error("Failed to create blob");
          toast.error("Failed to process cropped image");
        }
      });
    };

    img.onerror = () => {
      console.error("Failed to load image");
      toast.error("Failed to load image for cropping");
    };
  };

  const handleUpload = async (index: number) => {
    console.log("Upload button clicked for slot", index);
    const slot = slots[index];
    console.log("Slot data:", { uploadedImageUrl: slot.uploadedImageUrl, title: slot.title });

    if (!slot.uploadedImageUrl) {
      console.log("Validation failed:", { hasImage: !!slot.uploadedImageUrl });
      toast.error("Image required!");
      return;
    }

    try {
      console.log("Making API call to:", "/api/admin/recent");
      const res = await axios.post("/api/admin/recent", {
        image: slot.uploadedImageUrl,
        title: slot.title.trim(),
        description: slot.description.trim(),
        order: index + 1,
      });
      console.log("API response:", res.data);
      if (res.data.success) {
        toast.success("Recent product uploaded!");
        loadRecentImages(); // Reload to get updated list
        const newSlots = [...slots];
        newSlots[index] = { imageFile: null, uploadedImageUrl: "", title: "", description: "", crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null, isCropping: false };
        setSlots(newSlots);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.error || "Upload failed");
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      const res = await axios.delete(`/api/admin/recent?id=${id}`);
      if (res.data.success) {
        toast.success("Deleted!");
        loadRecentImages(); // Reload to get updated list
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-800">Recent Products</h1>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin" className="text-indigo-600 hover:text-indigo-800">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/recent" className="text-gray-700 font-medium">
                Recent
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slots.map((slot, index) => (
          <div key={index} className="border p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Slot {index + 1}</h3>
            
            {/* Step 1: Select Image */}
            <div>
              <label className="block text-sm font-medium mb-2">Step 1: Select Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleImageSelect(index, e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            {/* Step 2: Crop Image (Auto-opens) */}
            {slot.imageFile && !slot.uploadedImageUrl && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Step 2:</strong> Image selected: {slot.imageFile.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">Crop dialog opened automatically</p>
              </div>
            )}
            
            {/* Step 3: Preview and Title */}
            {slot.uploadedImageUrl && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 mb-2">
                  <strong>Step 3:</strong> Image cropped and uploaded successfully!
                </p>
                <p className="text-xs text-gray-600 mb-2">URL: {slot.uploadedImageUrl.substring(0, 50)}...</p>
                <img 
                  src={slot.uploadedImageUrl} 
                  alt="Preview" 
                  className="w-full h-32 object-cover rounded mb-2"
                  onError={(e) => console.error("Image failed to load:", slot.uploadedImageUrl, e)}
                  onLoad={() => console.log("Image loaded successfully:", slot.uploadedImageUrl)}
                />
                <Input
                  type="text"
                  placeholder="Enter product title (optional)"
                  value={slot.title}
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index].title = e.target.value;
                    setSlots(newSlots);
                  }}
                  className="mb-2"
                />
                <textarea
                  placeholder="Enter product description (optional)"
                  value={slot.description}
                  onChange={(e) => {
                    const newSlots = [...slots];
                    newSlots[index].description = e.target.value;
                    setSlots(newSlots);
                  }}
                  className="w-full p-2 border rounded mb-2"
                  rows={3}
                />
              </div>
            )}
            
            {/* Step 4: Upload to Database */}
            <div>
              <Button
                onClick={() => handleUpload(index)}
                disabled={!slot.uploadedImageUrl}
                className="w-full"
                variant={slot.uploadedImageUrl ? "default" : "secondary"}
              >
                {slot.uploadedImageUrl 
                  ? `✅ Upload Slot ${index + 1}` 
                  : `Upload Slot ${index + 1} (Complete steps 1-3 first)`}
              </Button>
              {(!slot.uploadedImageUrl) && (
                <p className="text-xs text-gray-500 mt-1">
                  Select image, crop it, and optionally enter title and description
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <div>
          <h2 className="text-lg font-medium mb-3">Uploaded Recent Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadedImages.map((img) => (
              <div key={img._id} className="relative border rounded-md p-2">
                <img src={img.image} alt={img.title} className="w-full h-32 object-cover" />
                <p className="text-sm mt-1 font-semibold">{img.title}</p>
                {img.description && <p className="text-xs mt-1 text-gray-600">{img.description.substring(0, 50)}...</p>}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1"
                  onClick={() => handleDeleteImage(img._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          {currentCropIndex !== null && slots[currentCropIndex]?.imageFile && (
            <div className="relative h-64">
              <Cropper
                image={URL.createObjectURL(slots[currentCropIndex].imageFile!)}
                crop={slots[currentCropIndex].crop}
                zoom={slots[currentCropIndex].zoom}
                aspect={16 / 9}
                onCropChange={(crop) => onCropChange(currentCropIndex, crop)}
                onZoomChange={(zoom) => onZoomChange(currentCropIndex, zoom)}
                onCropComplete={(croppedArea, croppedAreaPixels) => onCropComplete(currentCropIndex, croppedArea, croppedAreaPixels)}
              />
            </div>
          )}
          <Button onClick={() => currentCropIndex !== null && applyCrop(currentCropIndex)}>
            Apply Crop
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
