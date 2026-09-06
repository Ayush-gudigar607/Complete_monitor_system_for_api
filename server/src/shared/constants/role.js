//roles
export const ROLES=[
    "SUPER_ADMIN",
    "CLIENT_ADMIN",
    "CLIENT_ROLE"
]

// client roles
export const CLIENT_ROLES=[
    "CLIENT_ADMIN",
    "CLIENT_ROLE"
]

//Application roles
export const APPLICATION_ROLES={
    SUPER_ADMIN:"SUPER_ADMIN",
    CLIENT_ADMIN:"CLIENT_ADMIN",
    CLIENT_ROLE:"CLIENT_ROLE"
}

//check the isValidClientRole
export const isValidClientRole=(role)=>CLIENT_ROLES.includes(role);

//check the validRole
export const isValidRole=(role)=>ROLES.includes(role);
