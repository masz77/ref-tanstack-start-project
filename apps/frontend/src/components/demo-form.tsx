import { useForm } from '@tanstack/react-form'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const roleItems = [
  { label: 'Developer', value: 'developer' },
  { label: 'Designer', value: 'designer' },
  { label: 'Manager', value: 'manager' },
  { label: 'Other', value: 'other' },
]

export function DemoForm() {
  const id = useId()
  const nameId = `${id}-name`
  const emailId = `${id}-email`
  const roleId = `${id}-role`
  const messageId = `${id}-message`

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: '',
      message: '',
    },
    onSubmit: async ({ value }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      alert(`Form submitted!\n${JSON.stringify(value, null, 2)}`)
    },
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Contact Us</CardTitle>
        <CardDescription>Fill in the form below and we'll get back to you</CardDescription>
      </CardHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <CardContent>
          <FieldGroup>
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return 'Name is required'
                  if (value.length < 2) return 'Name must be at least 2 characters'
                  if (value.length > 100) return 'Name must be 100 characters or less'
                  return undefined
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={nameId}>Name</FieldLabel>
                  <Input
                    id={nameId}
                    placeholder="Your name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>
                      {field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]}
                    </FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return 'Email is required'
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email'
                  return undefined
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                  <Input
                    id={emailId}
                    type="email"
                    placeholder="you@example.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>
                      {field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]}
                    </FieldError>
                  )}
                </Field>
              )}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={roleId}>Role</FieldLabel>
                  <Select
                    items={roleItems}
                    value={field.state.value || null}
                    onValueChange={(value) => field.handleChange(value as string)}
                  >
                    <SelectTrigger id={roleId}>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {roleItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="message"
              validators={{
                onChange: ({ value }) => {
                  if (value && value.length > 500) return 'Message must be 500 characters or less'
                  return undefined
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0 || undefined}>
                  <FieldLabel htmlFor={messageId}>Message</FieldLabel>
                  <Textarea
                    id={messageId}
                    placeholder="Tell us what you need..."
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <FieldError>
                      {field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]}
                    </FieldError>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Field orientation="horizontal">
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    form.reset()
                  }}
                >
                  Reset
                </Button>
              </Field>
            )}
          </form.Subscribe>
        </CardFooter>
      </form>
    </Card>
  )
}
