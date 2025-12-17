import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service
@server("http://localhost:3001", "Development server")
namespace ProjectAPI;

// Common models
model Error {
  code: string;
  message: string;
}

model PaginationMeta {
  page: int32;
  pageSize: int32;
  total: int32;
  totalPages: int32;
}

// User models
model User {
  id: string;
  email: string;
  name: string;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

model CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

model UpdateUserRequest {
  name?: string;
}

model UserListResponse {
  data: User[];
  meta: PaginationMeta;
}

// Health check
@route("/health")
@tag("Health")
interface Health {
  @get
  check(): {
    status: "ok";
    timestamp: utcDateTime;
  };
}

// Users API
@route("/users")
@tag("Users")
interface Users {
  @get
  list(@query page?: int32 = 1, @query pageSize?: int32 = 20): UserListResponse;

  @post
  create(@body body: CreateUserRequest): {
    @statusCode statusCode: 201;
    @body body: User;
  };

  @route("/{id}")
  @get
  get(@path id: string): User | {
    @statusCode statusCode: 404;
    @body body: Error;
  };

  @route("/{id}")
  @patch
  update(@path id: string, @body body: UpdateUserRequest): User;

  @route("/{id}")
  @delete
  delete(@path id: string): {
    @statusCode statusCode: 204;
  };
}
