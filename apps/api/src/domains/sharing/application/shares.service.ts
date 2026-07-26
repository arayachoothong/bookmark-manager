import { BadRequestException, Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import { CollectionAccessService } from "../../collections/domain/collection-access.service";
import { NotFoundError } from "../../collections/domain/collection.errors";
import type { ShareWithGrantee } from "../infrastructure/shares.repository";
import { SharesRepository } from "../infrastructure/shares.repository";
import type { CreateShareDto } from "../interface/dto/create-share.dto";

function toShareResponse(share: ShareWithGrantee) {
  return {
    granteeUserId: share.granteeUserId,
    email: share.grantee.email,
    createdAt: share.createdAt,
  };
}

function assertEmail(email: unknown): string {
  if (typeof email !== "string" || email.trim().length === 0) {
    throw new BadRequestException("email is required");
  }
  return email.trim();
}

@Injectable()
export class SharesService {
  constructor(
    private readonly sharesRepository: SharesRepository,
    private readonly collectionAccessService: CollectionAccessService,
  ) {}

  async create(user: User, collectionId: string, dto: CreateShareDto) {
    await this.collectionAccessService.getWritableOrThrow(user.id, collectionId);
    const email = assertEmail(dto.email);
    const grantee = await this.sharesRepository.findUserByEmail(email);
    if (!grantee) {
      throw new NotFoundError("User not found");
    }
    const share = await this.sharesRepository.createShare(
      collectionId,
      grantee.id,
    );
    return toShareResponse(share);
  }

  async list(user: User, collectionId: string) {
    await this.collectionAccessService.getWritableOrThrow(user.id, collectionId);
    const shares = await this.sharesRepository.listByCollection(collectionId);
    return shares.map(toShareResponse);
  }

  async revoke(
    user: User,
    collectionId: string,
    granteeUserId: string,
  ): Promise<void> {
    await this.collectionAccessService.getWritableOrThrow(user.id, collectionId);
    const removed = await this.sharesRepository.deleteShare(
      collectionId,
      granteeUserId,
    );
    if (!removed) {
      throw new NotFoundError("Share not found");
    }
  }
}
